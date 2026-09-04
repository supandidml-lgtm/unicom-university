import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts', 'test/**/*.unit-spec.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
