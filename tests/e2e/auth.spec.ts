import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

/**
 * Auth flow tests — FR-001, FR-002
 *
 * Tests:
 *   1. Valid login → redirects to dashboard
 *   2. Invalid login → shows inline error message
 *   3. Empty form submission → shows client-side field validation errors
 */

const E2E_USERNAME = process.env['E2E_USERNAME'] ?? 'admin';
const E2E_PASSWORD = process.env['E2E_PASSWORD'] ?? 'password';

test.describe('Authentication — FR-001', () => {
  test('should redirect to dashboard after valid login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();

    // Verify we are on the login page
    await expect(loginPage.submitButton).toBeVisible();

    await loginPage.login(E2E_USERNAME, E2E_PASSWORD);

    // Should navigate to the dashboard (route '/')
    await page.waitForURL('/', { timeout: 15_000 });
    await dashboardPage.waitForLoad();

    // Confirm the dashboard heading is present
    await expect(dashboardPage.heading).toBeVisible();
  });

  test('should show inline error for invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login('invalid_user_that_does_not_exist', 'wrongpassword123');

    // Server-side error message should appear
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 10_000 });
    await expect(loginPage.errorMessage).toContainText('Invalid username or password');

    // Should remain on the login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show field-level validation error when username is empty', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    // Submit with empty fields — Zod client-side validation fires
    await loginPage.submitButton.click();

    // Username field validation error
    const usernameError = page.locator('#username-error');
    await expect(usernameError).toBeVisible({ timeout: 5_000 });
    await expect(usernameError).toContainText('Username is required');

    // Should remain on the login page
    await expect(page).toHaveURL(/\/login/);
  });
});
