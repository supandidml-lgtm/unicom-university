import { env } from "./env.js";
import { AiExamGenerationJobHandler } from "./handlers/ai-exam-generation.handler.js";
import { MediaProcessingJobHandler } from "./handlers/media-processing.handler.js";
import { PdfProcessingJobHandler } from "./handlers/pdf-processing.handler.js";

async function main() {
  console.log(`🚀 Starting Unicom University Background Worker (${env.APP_NAME} v${env.APP_VERSION})...`);
  console.log(`📦 AI Provider: ${env.AI_PROVIDER}`);
  console.log(`📦 Storage Driver: ${env.STORAGE_DRIVER}`);

  const aiExamHandler = new AiExamGenerationJobHandler();
  const mediaHandler = new MediaProcessingJobHandler();
  const pdfHandler = new PdfProcessingJobHandler();

  console.log("✅ Worker handlers initialized successfully:");
  console.log(`  - ${aiExamHandler.jobType}`);
  console.log(`  - ${mediaHandler.jobType}`);
  console.log(`  - ${pdfHandler.jobType}`);

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down worker gracefully...`);
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (process.env["NODE_ENV"] !== "test") {
  main().catch((err) => {
    console.error("❌ Fatal error in worker:", err);
    process.exit(1);
  });
}
