import { defineConfig } from 'vitest/config'

// Standalone test config so unit tests don't boot the full TanStack Start app
// (router/nitro/vite plugins from vite.config.ts), which keeps the run fast and
// lets the process exit cleanly in CI.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
