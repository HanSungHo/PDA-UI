import { defineConfig } from '@playwright/test';
import process from 'node:process';

export default defineConfig({
  testDir: '../../tests/e2e',
  testMatch: 'mds-spc.e2e.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5186',
    locale: 'ko-KR',
    reducedMotion: 'reduce',
    viewport: { width: 360, height: 720 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mds-spc-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // Unique per config: quasar dev moves to the next free port instead of failing.
    command: 'npm run dev -- --port 5186',
    url: 'http://127.0.0.1:5186',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
