import { env } from 'node:process';

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-tests',
  testMatch: 'move-in-parent.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5175',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'move-in-mobile-chromium',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 1112 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 5175',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !env.CI,
    timeout: 120_000,
  },
});
