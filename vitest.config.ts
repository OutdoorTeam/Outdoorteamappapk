import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    hookTimeout: 60000,
    testTimeout: 60000,
    reporters: ['default']
  }
});
