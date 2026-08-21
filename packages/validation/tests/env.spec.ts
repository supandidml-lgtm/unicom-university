import { describe, it, expect } from "vitest";
import {
  apiEnvSchema,
  webEnvSchema,
  workerEnvSchema,
  validateEnv,
} from "../src/index.js";

describe("Environment Validation Schemas", () => {
  it("should successfully validate default API environment variables", () => {
    const validApiEnv = {
      NODE_ENV: "development",
      PORT: "4000",
      DATABASE_HOST: "localhost",
      DATABASE_PORT: "5432",
      DATABASE_USER: "unicom_admin",
      DATABASE_PASSWORD: "secret_password",
      DATABASE_NAME: "unicom_university",
      JWT_SECRET: "minimum_16_character_secret_key_dev",
    };

    const parsed = validateEnv(apiEnvSchema, validApiEnv);
    expect(parsed.PORT).toBe(4000);
    expect(parsed.DATABASE_PORT).toBe(5432);
    expect(parsed.DATABASE_USER).toBe("unicom_admin");
  });

  it("should successfully validate Web environment variables", () => {
    const validWebEnv = {
      NODE_ENV: "production",
      WEB_PORT: "3000",
      NEXT_PUBLIC_APP_URL: "https://university.unicom.co.id",
      NEXT_PUBLIC_API_URL: "https://university.unicom.co.id/api/v1",
    };

    const parsed = validateEnv(webEnvSchema, validWebEnv);
    expect(parsed.WEB_PORT).toBe(3000);
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("https://university.unicom.co.id");
  });

  it("should successfully validate Worker environment variables", () => {
    const validWorkerEnv = {
      NODE_ENV: "development",
      WORKER_PORT: "4001",
      STORAGE_DRIVER: "s3",
      AI_PROVIDER: "gemini",
    };

    const parsed = validateEnv(workerEnvSchema, validWorkerEnv);
    expect(parsed.STORAGE_DRIVER).toBe("s3");
    expect(parsed.AI_PROVIDER).toBe("gemini");
  });

  it("should fail validation when URL is invalid", () => {
    const invalidWebEnv = {
      NEXT_PUBLIC_APP_URL: "not-a-url",
    };

    expect(() => validateEnv(webEnvSchema, invalidWebEnv)).toThrow();
  });
});
