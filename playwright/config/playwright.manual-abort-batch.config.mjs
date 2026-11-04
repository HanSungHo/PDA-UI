import { defineConfig } from '@playwright/test';
import { fileURLToPath, URL } from 'node:url';

// The dev server runs from the repository root; Playwright defaults its cwd to this folder.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '../../tests/e2e',
  outputDir: '../../test-results',
  testMatch: 'manual-abort-batch.e2e.ts',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5194',
    viewport: { width: 360, height: 720 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'manual-abort-batch-chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // Unique per config: quasar dev moves to the next free port instead of failing.
    command: 'npm run dev -- --port 5194',
    cwd: repoRoot,
    url: 'http://127.0.0.1:5194',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
