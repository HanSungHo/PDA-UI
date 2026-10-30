import { defineConfig } from '@playwright/test';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';

// Web servers run from the repository root; Playwright defaults their cwd to this folder.
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

export default defineConfig({
  testDir: '../../playwright-tests/een-modify',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 360, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: fileURLToPath(new URL('../../mock-server/', import.meta.url)),
      url: 'http://127.0.0.1:8080/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -- -H 127.0.0.1 -p 5174',
      cwd: repoRoot,
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
