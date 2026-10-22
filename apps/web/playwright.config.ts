import { defineConfig } from '@playwright/test';

// Pick API_PORT from the git-ignored root .env when present.
try {
  process.loadEnvFile('../../.env');
} catch {
  /* no root .env */
}

const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3001);
const API_ORIGIN = process.env.API_ORIGIN ?? `http://localhost:${process.env.API_PORT ?? 3000}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `pnpm exec next dev -p ${WEB_PORT}`,
    url: `http://localhost:${WEB_PORT}/az`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ADMIN_HOST: 'admin.localhost',
      API_ORIGIN,
      API_INTERNAL_URL: API_ORIGIN,
    },
  },
});
