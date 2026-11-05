import { defineConfig } from '@playwright/test';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

// Web servers run from the repository root; Playwright defaults their cwd to this folder.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '../../tests/e2e',
  outputDir: '../../test-results',
  testMatch: 'lot-status-by-bay.e2e.ts',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5188',
    viewport: { width: 432, height: 864 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'lot-status-by-bay-chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node mock-server/src/server.js',
      cwd: repoRoot,
      url: 'http://127.0.0.1:8182/health',
      env: { ...process.env, PORT: '8182' },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      // Unique per config: quasar dev moves to the next free port instead of failing.
      command: 'npm run dev -- --port 5188',
      cwd: repoRoot,
      url: 'http://127.0.0.1:5188',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
