import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter.js";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor.js";
import helmet from "helmet";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env["NODE_ENV"] === "production",
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const configured = (process.env["CORS_ALLOWED_ORIGINS"] || "http://localhost:3000")
        .split(",")
        .map((o) => o.trim());
      const isAllowed =
        configured.includes(origin) ||
        origin === "https://unicom-university-web.vercel.app" ||
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1");

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  });

  // Global Route Prefix
  app.setGlobalPrefix("api/v1");

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Error Filter & Response Transform Interceptor
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = process.env["PORT"] ? parseInt(process.env["PORT"], 10) : 4000;
  await app.listen(port);
  logger.log(`🚀 Unicom University API is running on http://localhost:${port}/api/v1`);
  logger.log(`🩺 Health check available at http://localhost:${port}/api/v1/health`);
}

bootstrap().catch((err) => {
  console.error("❌ Fatal error during bootstrap:", err);
  process.exit(1);
});
