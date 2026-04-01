import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Dashboard page (/).
 *
 * Relevant data-testid values in DashboardPage.tsx:
 *   - dashboard-retry   → retry button on error state
 *   - projects-grid     → the grid container of active project summary cards
 */
export class DashboardPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly projectsGrid: Locator;
  readonly retryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // The h1 "Dashboard" heading — confirms we are on the right page
    this.heading = page.getByRole('heading', { name: 'Dashboard', level: 1 });
    this.projectsGrid = page.getByTestId('projects-grid');
    this.retryButton = page.getByTestId('dashboard-retry');
  }

  async goto() {
    await this.page.goto('/');
  }

  /** Returns true once the dashboard heading is visible in the viewport. */
  async waitForLoad() {
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }
}
