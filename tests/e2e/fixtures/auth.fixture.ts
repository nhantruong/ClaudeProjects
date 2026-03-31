import { test as base, type Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Auth fixture — logs in once per test worker and provides an authenticated Page.
 *
 * Usage:
 *   import { test } from '../fixtures/auth.fixture';
 *
 *   test('my protected test', async ({ authenticatedPage }) => { ... });
 *
 * Credentials are read from environment variables so they never appear in source:
 *   E2E_USERNAME  (default: 'admin')
 *   E2E_PASSWORD  (default: 'password')
 *
 * The session cookie is set by the API on POST /auth/login and is automatically
 * included in subsequent requests by the browser context.
 */

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const username = process.env['E2E_USERNAME'] ?? 'admin';
    const password = process.env['E2E_PASSWORD'] ?? 'password';

    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForDashboard(username, password);

    await use(page);
  },
});

export { expect } from '@playwright/test';
