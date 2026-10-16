import process from 'node:process';

import { defineConfig } from '@playwright/test';

const appUrl = 'http://127.0.0.1:5173';
const mockServerUrl = 'http://127.0.0.1:8080';

export default defineConfig({
  testDir: './playwright-tests',
  testMatch: '**/remote-cvd*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: appUrl,
    viewport: { width: 390, height: 844 },
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 5173',
      url: appUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { CI: '1' },
    },
    {
      command: 'npm run dev --prefix mock-server',
      url: `${mockServerUrl}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
