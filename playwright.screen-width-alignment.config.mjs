import { defineConfig } from '@playwright/test';
import process from 'node:process';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'screen-width-alignment.e2e.ts',
  fullyParallel: false,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5177',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'screen-width-alignment-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 5177',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
