import { workerEnvSchema, validateEnv, WorkerEnv } from "@unicom/validation";

export const env: WorkerEnv = validateEnv(workerEnvSchema, process.env);
