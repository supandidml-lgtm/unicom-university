import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { loadApiEnvironment } from '@unicom/config';
import { createHmac } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';

@Injectable()
export class RecoveryRateLimitService {
  private client?: RedisClientType;

  async consume(
    scope: 'forgot' | 'reset',
    identifier: string,
    ipAddress: string,
  ): Promise<boolean> {
    const environment = loadApiEnvironment();
    const client = await this.getClient();
    const ttl = environment.AUTH_RECOVERY_WINDOW_MINUTES * 60;
    const keys = [this.key(scope, 'subject', identifier), this.key(scope, 'ip', ipAddress)];
    const result = await Promise.all(
      keys.map(async (key) => {
        const current = Number((await client.get(key)) ?? '0');
        if (current >= environment.AUTH_RECOVERY_MAX_REQUESTS) return false;
        const multi = client.multi();
        multi.incr(key);
        multi.expire(key, ttl, 'NX');
        await multi.exec();
        return true;
      }),
    );
    return result.every(Boolean);
  }

  private key(scope: string, dimension: string, value: string): string {
    const digest = createHmac('sha256', loadApiEnvironment().AUTH_RATE_LIMIT_SECRET)
      .update(value, 'utf8')
      .digest('hex');
    return `auth:recovery:${process.env['NODE_ENV'] ?? 'development'}:${scope}:${dimension}:${digest}`;
  }

  private async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) return this.client;
    const environment = loadApiEnvironment();
    const client = createClient({
      socket: { host: environment.REDIS_HOST, port: environment.REDIS_PORT, connectTimeout: 3_000 },
      ...(environment.REDIS_PASSWORD ? { password: environment.REDIS_PASSWORD } : {}),
    });
    client.on('error', () => undefined);
    try {
      await client.connect();
    } catch {
      await client.disconnect().catch(() => undefined);
      throw new ServiceUnavailableException('Account recovery is temporarily unavailable.');
    }
    this.client = client;
    return client;
  }
}
