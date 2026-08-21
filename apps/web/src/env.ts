import { webEnvSchema, validateEnv } from "@unicom/validation";

export const env = validateEnv(webEnvSchema, {
  NODE_ENV: process.env["NODE_ENV"],
  APP_NAME: process.env["APP_NAME"],
  APP_VERSION: process.env["APP_VERSION"],
  WEB_PORT: process.env["WEB_PORT"],
  NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
  NEXT_PUBLIC_API_URL: process.env["NEXT_PUBLIC_API_URL"],
});
