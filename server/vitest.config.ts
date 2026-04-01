import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in Node environment (not browser)
    environment: 'node',
    // Use forks pool so top-level await in test files works correctly
    pool: 'forks',
    // Glob for test files — colocated with source files
    include: ['src/**/*.test.ts'],
    // Coverage reporting
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/server.ts'],
      // Target: 80% for new features (per CLAUDE.md)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
