import { loadWorkerEnvironment } from '@unicom/config';
import { NestFactory } from '@nestjs/core';
import pino from 'pino';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const environment = loadWorkerEnvironment();
const logger = pino({
  level: environment.LOG_LEVEL,
  base: { service: 'worker', environment: environment.APP_ENV },
});

const apiRoot = resolve(process.cwd(), '..', 'api');
const apiModulePath =
  environment.NODE_ENV === 'development'
    ? resolve(apiRoot, 'src', 'app.module.ts')
    : resolve(apiRoot, 'dist', 'app.module.js');
const processorModulePath =
  environment.NODE_ENV === 'development'
    ? resolve(
        apiRoot,
        'src',
        'modules',
        'ai-question-generation',
        'ai-question-generation-job.processor.ts',
      )
    : resolve(
        apiRoot,
        'dist',
        'modules',
        'ai-question-generation',
        'ai-question-generation-job.processor.js',
      );
const notificationProcessorModulePath =
  environment.NODE_ENV === 'development'
    ? resolve(apiRoot, 'src', 'modules', 'notifications', 'notification-delivery.processor.ts')
    : resolve(apiRoot, 'dist', 'modules', 'notifications', 'notification-delivery.processor.js');
const certificateProcessorModulePath =
  environment.NODE_ENV === 'development'
    ? resolve(apiRoot, 'src', 'modules', 'certificates', 'certificate.processor.ts')
    : resolve(apiRoot, 'dist', 'modules', 'certificates', 'certificate.processor.js');

let stopping = false;
let processedJobs = 0;
let lastSuccessfulPollAt: Date | undefined;
let lastFailureAt: Date | undefined;
let lastHealthLogAt = 0;

async function run(): Promise<void> {
  const appModule = (await import(pathToFileURL(apiModulePath).href)) as { AppModule: unknown };
  const processorModule = (await import(pathToFileURL(processorModulePath).href)) as {
    AiQuestionGenerationJobProcessor: abstract new (...args: never[]) => {
      processNext(): Promise<boolean>;
    };
  };
  const notificationModule = (await import(
    pathToFileURL(notificationProcessorModulePath).href
  )) as {
    NotificationDeliveryProcessor: abstract new (...args: never[]) => {
      processNext(): Promise<boolean>;
    };
  };
  const certificateModule = (await import(pathToFileURL(certificateProcessorModulePath).href)) as {
    CertificateProcessor: abstract new (...args: never[]) => { processNext(): Promise<boolean> };
  };
  const context = await NestFactory.createApplicationContext(appModule.AppModule as never, {
    logger: false,
  });
  const processor = context.get(processorModule.AiQuestionGenerationJobProcessor);
  const notificationProcessor = context.get(notificationModule.NotificationDeliveryProcessor);
  const certificateProcessor = context.get(certificateModule.CertificateProcessor);
  logger.info(
    {
      aiConcurrency: environment.AI_WORKER_CONCURRENCY,
      emailConcurrency: environment.EMAIL_WORKER_CONCURRENCY,
      jobLeaseSeconds: environment.WORKER_JOB_LEASE_SECONDS,
      queueTransport: 'postgresql',
    },
    'Worker started.',
  );
  while (!stopping) {
    const settled = await Promise.allSettled([
      ...Array.from({ length: environment.AI_WORKER_CONCURRENCY }, () => processor.processNext()),
      ...Array.from({ length: environment.EMAIL_WORKER_CONCURRENCY }, () =>
        notificationProcessor.processNext(),
      ),
      certificateProcessor.processNext(),
    ]);
    const failures = settled.filter((result) => result.status === 'rejected');
    const completed = settled.filter(
      (result): result is PromiseFulfilledResult<boolean> =>
        result.status === 'fulfilled' && result.value,
    ).length;
    if (failures.length > 0) {
      lastFailureAt = new Date();
      logger.warn(
        { errorCode: 'WORKER_POLL_FAILED', failedOperations: failures.length },
        'Worker poll completed with failures.',
      );
    } else {
      lastSuccessfulPollAt = new Date();
      processedJobs += completed;
    }
    logHealth();
    if (completed === 0) await delay(environment.WORKER_POLL_INTERVAL_MS);
  }
  await context.close();
  logger.info({ processedJobs }, 'Worker stopped gracefully.');
}

void run().catch((error: unknown) => {
  logger.error(
    { err: error instanceof Error ? error.message : 'worker_start_failed' },
    'Worker stopped.',
  );
  process.exitCode = 1;
});

function shutdown(signal: string): void {
  if (stopping) return;
  stopping = true;
  logger.info({ signal }, 'Worker is draining in-flight operations.');
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function logHealth(): void {
  const now = Date.now();
  if (now - lastHealthLogAt < environment.WORKER_HEALTH_LOG_INTERVAL_SECONDS * 1_000) return;
  lastHealthLogAt = now;
  logger.info(
    {
      health: {
        status: lastFailureAt && !lastSuccessfulPollAt ? 'degraded' : 'ok',
        queueTransport: 'postgresql',
        processedJobs,
        lastSuccessfulPollAt: lastSuccessfulPollAt?.toISOString(),
        lastFailureAt: lastFailureAt?.toISOString(),
      },
    },
    'Worker health.',
  );
}
