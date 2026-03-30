import { defineConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, 'e2e/.auth/state.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  workers: 3,
  retries: 1,
  use: {
    baseURL: 'https://localhost:6100',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      timeout: 30_000,
    },
    {
      name: 'visual',
      testMatch: /visual\.spec\.ts/,
      timeout: 60_000,
    },
    {
      name: 'e2e:production',
      testMatch: /shared\/.*-e2e\.spec\.ts/,
      dependencies: ['setup'],
      timeout: 60_000,
      use: {
        storageState: AUTH_FILE,
        ignoreHTTPSErrors: true,
        viewport: { width: 1800, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'e2e:demo',
      testMatch: /shared\/.*-e2e\.spec\.ts/,
      timeout: 60_000,
      use: {
        envType: 'demo' as const,
        ignoreHTTPSErrors: true,
        viewport: { width: 1800, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
    {
      name: 'e2e:production-only',
      testMatch: /(supabase-e2e|bgm-e2e|misc-e2e|permissions-e2e|secret-dice-e2e|archive-e2e|asset-tag-e2e)\.spec\.ts/,
      dependencies: ['setup'],
      timeout: 60_000,
      use: {
        storageState: AUTH_FILE,
        ignoreHTTPSErrors: true,
        viewport: { width: 1800, height: 900 },
        permissions: ['clipboard-read', 'clipboard-write'],
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 6100,
    reuseExistingServer: true,
  },
});
