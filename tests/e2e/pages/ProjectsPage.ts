import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Projects page (/projects).
 *
 * Relevant data-testid values in ProjectsPage.tsx and child components:
 *   - new-project-button           → "New Project" button in the page header (admin/manager)
 *   - create-first-project-button  → "Create project" button in the empty state (admin/manager)
 *   - project-card-{id}            → individual project card link (ProjectCard.tsx)
 *
 * Relevant data-testid values in CreateProjectModal.tsx:
 *   - create-project-name        → name input
 *   - create-project-description → description textarea
 *   - create-project-domain      → domain Select trigger
 *   - create-project-status      → status Select trigger
 *   - create-project-start-date  → start date input
 *   - create-project-end-date    → end date input
 *   - create-project-submit      → submit button
 */
export class ProjectsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newProjectButton: Locator;
  readonly createFirstProjectButton: Locator;

  // Modal form fields
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly domainTrigger: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Projects', level: 1 });
    this.newProjectButton = page.getByTestId('new-project-button');
    this.createFirstProjectButton = page.getByTestId('create-first-project-button');

    // Modal locators — scoped to the dialog for safety
    this.modal = page.getByRole('dialog', { name: 'New Project' });
    this.nameInput = page.getByTestId('create-project-name');
    this.descriptionInput = page.getByTestId('create-project-description');
    this.domainTrigger = page.getByTestId('create-project-domain');
    this.submitButton = page.getByTestId('create-project-submit');
  }

  async goto() {
    await this.page.goto('/projects');
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Open the "New Project" modal.
   * Uses the header button if visible, falls back to the empty-state button.
   */
  async openCreateModal() {
    const headerBtn = this.newProjectButton;
    if (await headerBtn.isVisible()) {
      await headerBtn.click();
    } else {
      await this.createFirstProjectButton.click();
    }
    await this.modal.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /**
   * Fill and submit the "New Project" form.
   * @param name       Project name (required, min 2 chars)
   * @param domain     Domain value: 'electromechanical' | 'bim' | 'software' | 'other'
   * @param description Optional description
   */
  async fillAndSubmitCreateForm(
    name: string,
    domain: 'electromechanical' | 'bim' | 'software' | 'other',
    description?: string
  ) {
    await this.nameInput.fill(name);

    if (description) {
      await this.descriptionInput.fill(description);
    }

    // Radix Select — click the trigger to open the dropdown, then select the item
    await this.domainTrigger.click();
    // The option appears in a portal; match by the visible option text
    const domainLabels: Record<string, string> = {
      electromechanical: 'Electromechanical',
      bim: 'BIM',
      software: 'Software',
      other: 'Other',
    };
    await this.page.getByRole('option', { name: domainLabels[domain] }).click();

    await this.submitButton.click();
  }

  /** Returns the project card locator for a given project id. */
  projectCard(projectId: number): Locator {
    return this.page.getByTestId(`project-card-${projectId}`);
  }

  /**
   * Returns a locator that matches any project card whose accessible name
   * contains the given project name. Useful when you don't know the id yet.
   */
  projectCardByName(name: string): Locator {
    return this.page.getByRole('link').filter({ hasText: name });
  }
}
