import { defineConfig } from '@playwright/test';
import process from 'node:process';

export default defineConfig({
  testDir: './playwright-tests',
  testMatch: 'dispatching.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5183',
    locale: 'ko-KR',
    reducedMotion: 'reduce',
    viewport: { width: 350, height: 720 },
  },
  projects: [{ name: 'dispatching-chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node mock-server/src/server.js',
      url: 'http://127.0.0.1:8080/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5183',
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
