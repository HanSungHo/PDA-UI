import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './playwright-tests',
  testIgnore: ['dispatching.spec.ts'],
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:6006',
    locale: 'en-US',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'android-13-mobile-360x720',
      use: {
        ...devices['Pixel 7a'],
        viewport: { width: 360, height: 720 },
        screen: { width: 360, height: 720 },
      },
    },
  ],
  webServer: {
    command: 'npm run storybook -- --ci --no-open',
    url: 'http://127.0.0.1:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
