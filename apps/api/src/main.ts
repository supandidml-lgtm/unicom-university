import { Logger } from 'nestjs-pino';
import { createApiApplication } from './application.js';

async function bootstrap(): Promise<void> {
  const { app, environment } = await createApiApplication();
  await app.listen(environment.API_PORT, '0.0.0.0');
  app.get(Logger).log(`API started on port ${environment.API_PORT}`, 'Bootstrap');
}

void bootstrap();
