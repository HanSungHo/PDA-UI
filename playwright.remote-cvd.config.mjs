import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-tests',
  testMatch: 'remote-cvd.spec.ts',
  fullyParallel: false,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5181',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    viewport: { width: 350, height: 1372 },
  },
  projects: [{ name: 'remote-cvd-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 5181',
    url: 'http://127.0.0.1:5181',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
