import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  testMatch: 'ui.spec.js',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5184',
    screenshot: 'on',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `V4_DB_PATH=/tmp/bhss-v4-e2e-${process.pid}.sqlite npm run dev`,
    url: 'http://127.0.0.1:5184',
    reuseExistingServer: true,
    timeout: 30000
  },
  reporter: [['list'], ['json', {
    outputFile: 'test-results/browser-results.json'
  }]]
});
