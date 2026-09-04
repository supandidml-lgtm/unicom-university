import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { json } from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { Logger } from 'nestjs-pino';
import { corsAllowedOrigins, loadApiEnvironment } from '@unicom/config';
import { AppModule } from './app.module.js';
import { SafeHttpExceptionFilter } from './safe-http-exception.filter.js';

const requestIdPattern = /^[a-zA-Z0-9-]{8,128}$/;

function requestIdMiddleware(request: Request, response: Response, next: NextFunction): void {
  const suppliedRequestId = request.header('x-request-id');
  const requestId =
    suppliedRequestId && requestIdPattern.test(suppliedRequestId)
      ? suppliedRequestId
      : randomUUID();

  request.id = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}

function corsOriginGuard(allowedOrigins: ReadonlySet<string>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const origin = request.header('origin');
    if (origin && !allowedOrigins.has(origin)) {
      response.status(403).json({
        statusCode: 403,
        message: 'Origin is not allowed.',
        requestId: request.id,
      });
      return;
    }
    next();
  };
}

export async function createApiApplication() {
  const environment = loadApiEnvironment();
  const allowedOrigins = new Set(corsAllowedOrigins(environment));
  const app = await NestFactory.create(AppModule, { bodyParser: false, bufferLogs: true });
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', environment.AUTH_TRUST_PROXY ? 1 : false);

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          baseUri: ["'self'"],
          connectSrc: ["'self'"],
          defaultSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          ...(environment.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: environment.NODE_ENV === 'production',
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(corsOriginGuard(allowedOrigins));
  app.use(json({ limit: `${environment.API_JSON_BODY_LIMIT_KB}kb` }));
  app.useLogger(app.get(Logger));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allowed?: boolean) => void,
    ) => callback(null, !origin || allowedOrigins.has(origin)),
    credentials: true,
    allowedHeaders: ['content-type', 'x-csrf-token', 'x-request-id'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/live', 'health/ready'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new SafeHttpExceptionFilter());
  app.enableShutdownHooks();

  return { app, environment };
}
