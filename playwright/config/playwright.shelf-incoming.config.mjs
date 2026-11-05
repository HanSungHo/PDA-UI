import { defineConfig } from '@playwright/test';
import { fileURLToPath, URL } from 'node:url';

// Web servers run from the repository root; Playwright defaults their cwd to this folder.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '../../playwright-tests',
  testMatch: 'shelf-incoming.spec.ts',
  workers: 2,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5182',
    viewport: { width: 360, height: 720 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'shelf-incoming-chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node mock-server/src/server.js',
      cwd: repoRoot,
      url: 'http://127.0.0.1:8080/health',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -- --port 5182',
      cwd: repoRoot,
      url: 'http://127.0.0.1:5182',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
