import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { createClient, type RedisClientType } from 'redis';
import { loadApiEnvironment } from '@unicom/config';

@Injectable()
export class LoginRateLimitService {
  private client?: RedisClientType;

  async isBlocked(normalizedEmail: string, ipAddress: string): Promise<boolean> {
    const environment = loadApiEnvironment();
    const client = await this.getClient();
    const [accountAttempts, ipAttempts] = await Promise.all([
      client.get(this.accountKey(normalizedEmail)),
      client.get(this.ipKey(ipAddress)),
    ]);

    return (
      Number(accountAttempts ?? '0') >= environment.AUTH_LOGIN_MAX_FAILURES ||
      Number(ipAttempts ?? '0') >= environment.AUTH_LOGIN_IP_MAX_FAILURES
    );
  }

  async registerFailure(normalizedEmail: string, ipAddress: string): Promise<void> {
    const environment = loadApiEnvironment();
    const client = await this.getClient();
    const ttlSeconds = environment.AUTH_LOGIN_WINDOW_MINUTES * 60;
    await Promise.all([
      this.incrementWithinWindow(client, this.accountKey(normalizedEmail), ttlSeconds),
      this.incrementWithinWindow(client, this.ipKey(ipAddress), ttlSeconds),
    ]);
  }

  async clearAccountFailures(normalizedEmail: string): Promise<void> {
    await (await this.getClient()).sendCommand(['DEL', this.accountKey(normalizedEmail)]);
  }

  private async incrementWithinWindow(
    client: RedisClientType,
    key: string,
    ttlSeconds: number,
  ): Promise<void> {
    const multi = client.multi();
    multi.incr(key);
    multi.expire(key, ttlSeconds, 'NX');
    await multi.exec();
  }

  private accountKey(normalizedEmail: string): string {
    return `${this.namespace()}:account:${this.deriveIdentifier(normalizedEmail)}`;
  }

  private ipKey(ipAddress: string): string {
    return `${this.namespace()}:ip:${this.deriveIdentifier(ipAddress)}`;
  }

  private namespace(): string {
    return `auth:login:${process.env['NODE_ENV'] ?? 'development'}`;
  }

  private deriveIdentifier(value: string): string {
    return createHmac('sha256', loadApiEnvironment().AUTH_RATE_LIMIT_SECRET)
      .update(value, 'utf8')
      .digest('hex');
  }

  private async getClient(): Promise<RedisClientType> {
    if (this.client?.isOpen) {
      return this.client;
    }

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
      throw new ServiceUnavailableException('Authentication service is temporarily unavailable.');
    }

    this.client = client;
    return client;
  }
}
