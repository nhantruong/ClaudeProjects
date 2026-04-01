import { expect } from '@playwright/test';
import { test } from './fixtures/auth.fixture';
import { ProjectsPage } from './pages/ProjectsPage';

/**
 * Project management tests — FR-020, FR-021
 *
 * Tests:
 *   1. Create a project → it appears in the project list
 *
 * All tests use the authenticated page fixture (logged in as admin).
 * Project names are unique per test run to avoid state collisions.
 */

test.describe('Project management — FR-020', () => {
  test('should create a project and show it in the project list', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage);

    await projectsPage.goto();

    // Unique name prevents collisions across test runs
    const projectName = `E2E Test Project ${Date.now()}`;

    await projectsPage.openCreateModal();

    // Verify the modal opened
    await expect(projectsPage.modal).toBeVisible();

    await projectsPage.fillAndSubmitCreateForm(
      projectName,
      'software',
      'Created by automated E2E test'
    );

    // Modal should close after successful creation
    await expect(projectsPage.modal).not.toBeVisible({ timeout: 10_000 });

    // The new project card should appear in the list
    const newCard = projectsPage.projectCardByName(projectName);
    await expect(newCard).toBeVisible({ timeout: 15_000 });
  });

  test('should show a validation error when project name is too short', async ({ authenticatedPage }) => {
    const projectsPage = new ProjectsPage(authenticatedPage);

    await projectsPage.goto();
    await projectsPage.openCreateModal();

    // Type a name that is too short (< 2 chars)
    await projectsPage.nameInput.fill('X');
    await projectsPage.submitButton.click();

    // Zod fires client-side — error should appear below the name field
    const nameError = authenticatedPage.locator('#create-name-error');
    await expect(nameError).toBeVisible({ timeout: 5_000 });
    await expect(nameError).toContainText('at least 2 characters');

    // Modal should remain open
    await expect(projectsPage.modal).toBeVisible();
  });
});
