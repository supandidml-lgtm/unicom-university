import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import { verifyDatabaseConnection } from '@unicom/database';
import { createConnection } from 'node:net';

const redisProbeTimeoutMs = 3_000;

@Injectable()
export class ReadinessService {
  async verify(): Promise<void> {
    const environment = loadApiEnvironment();

    try {
      await Promise.all([
        verifyDatabaseConnection(),
        verifyRedisConnection({
          host: environment.REDIS_HOST,
          port: environment.REDIS_PORT,
          password: environment.REDIS_PASSWORD,
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException('Service is not ready.');
    }
  }
}

interface RedisConnectionOptions {
  host: string;
  port: number;
  password: string | undefined;
}

async function verifyRedisConnection(options: RedisConnectionOptions): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: options.host, port: options.port });
    let phase: 'auth' | 'ping' = options.password ? 'auth' : 'ping';
    let settled = false;

    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      socket.destroy();
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error('Redis readiness probe timed out.')));
    }, redisProbeTimeoutMs);

    socket.once('error', () => {
      finish(() => reject(new Error('Redis readiness probe failed.')));
    });

    socket.once('connect', () => {
      socket.write(
        phase === 'auth'
          ? toRedisCommand(['AUTH', options.password ?? ''])
          : toRedisCommand(['PING']),
      );
    });

    socket.on('data', (buffer: Buffer) => {
      const response = buffer.toString('utf8').trim();

      if (response.startsWith('-')) {
        finish(() => reject(new Error('Redis readiness probe was rejected.')));
        return;
      }

      if (phase === 'auth' && response === '+OK') {
        phase = 'ping';
        socket.write(toRedisCommand(['PING']));
        return;
      }

      if (phase === 'ping' && response === '+PONG') {
        finish(resolve);
      }
    });
  });
}

function toRedisCommand(parts: string[]): string {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(part)}\r\n${part}\r\n`)
    .join('')}`;
}
