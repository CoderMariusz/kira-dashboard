import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, 'e2e/browser-tests/.auth/admin.json')

export default defineConfig({
  testDir: './e2e/browser-tests',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 30_000,

  globalSetup: './e2e/browser-tests/global-setup.ts',

  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    storageState: AUTH_FILE,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
