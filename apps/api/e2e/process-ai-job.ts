import { createApiApplication } from '../src/application.js';
import { AiQuestionGenerationJobProcessor } from '../src/modules/ai-question-generation/ai-question-generation-job.processor.js';

const application = await createApiApplication();
await application.app.init();
try {
  await application.app.get(AiQuestionGenerationJobProcessor).processNext();
} finally {
  await application.app.close();
}
