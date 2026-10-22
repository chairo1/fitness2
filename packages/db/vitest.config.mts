import { defineConfig } from 'vitest/config';

// Local dev reads the repo-root .env; CI/prod provide DATABASE_URL directly.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* no .env file */
}

export default defineConfig({
  test: { fileParallelism: false, testTimeout: 30000 },
});
