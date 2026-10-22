import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-tests',
  testMatch: 'shelf-incoming.spec.ts',
  workers: 2,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5182',
    viewport: { width: 350, height: 720 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'shelf-incoming-chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node mock-server/src/server.js',
      url: 'http://127.0.0.1:8080/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5182',
      url: 'http://127.0.0.1:5182',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
