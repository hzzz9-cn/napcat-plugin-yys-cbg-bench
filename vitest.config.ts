import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup/test-plugin-context.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
    passWithNoTests: true,
  },
})
