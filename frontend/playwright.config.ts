import { defineConfig } from '@playwright/test';

// E2E responsive (deuda #4 de ESTADO.md). Usa el Chrome instalado
// (channel) — no descarga navegadores. Requiere backend (4000) y
// frontend (3000) corriendo; si ya están arriba, los reusa.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    channel: 'chrome',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../backend',
      url: 'http://localhost:4000/',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'npm start',
      cwd: '.',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 180_000,
      env: { BROWSER: 'none' },
    },
  ],
});
