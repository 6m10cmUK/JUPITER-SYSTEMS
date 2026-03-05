import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:6100',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 6100,
    reuseExistingServer: true,
  },
});
