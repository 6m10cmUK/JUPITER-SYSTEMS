import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, 'e2e/.auth/state.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'https://localhost:6100',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 120_000,
      use: {
        headless: false,
        channel: 'chrome',
      },
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      timeout: 60_000,
    },
    {
      name: 'e2e',
      testMatch: /supabase-e2e\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        storageState: AUTH_FILE,
        ignoreHTTPSErrors: true,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 6100,
    reuseExistingServer: true,
  },
});
