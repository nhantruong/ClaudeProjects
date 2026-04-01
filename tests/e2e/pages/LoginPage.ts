import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Login page (/login).
 *
 * Selector strategy: data-testid only, per project conventions.
 * Relevant data-testid values in LoginPage.tsx:
 *   - login-username   → username input
 *   - login-password   → password input
 *   - login-submit     → submit button
 *   - login-error      → server-side error paragraph
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByTestId('login-username');
    this.passwordInput = page.getByTestId('login-password');
    this.submitButton = page.getByTestId('login-submit');
    this.errorMessage = page.getByTestId('login-error');
  }

  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Fill credentials and submit the form.
   * Waits for the submit button to become enabled before clicking.
   */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Log in and wait for the redirect to the dashboard.
   * Throws if the navigation does not happen within the default timeout.
   */
  async loginAndWaitForDashboard(username: string, password: string) {
    await this.login(username, password);
    await this.page.waitForURL('/', { timeout: 15_000 });
  }
}
