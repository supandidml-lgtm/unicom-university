import { createClient } from 'redis';

export default async function globalSetup(): Promise<void> {
  const client = createClient({ socket: { host: 'localhost', port: 6379 } });
  await client.connect();
  const keys: string[] = [];
  for await (const batch of client.scanIterator({ MATCH: 'auth:login:test:*' })) {
    keys.push(...batch);
  }
  if (keys.length > 0) {
    await client.sendCommand(['DEL', ...keys]);
  }
  await client.quit();
}
