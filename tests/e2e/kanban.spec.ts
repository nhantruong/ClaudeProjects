import { expect, type Page } from '@playwright/test';
import { test } from './fixtures/auth.fixture';
import { ProjectsPage } from './pages/ProjectsPage';
import { KanbanPage } from './pages/KanbanPage';

/**
 * Kanban board tests — FR-030, FR-040, FR-041
 *
 * Tests:
 *   1. Create a task via quick-add form → task card appears in the correct column
 *   2. Drag an existing task to the "Done" column → task moves to Done
 *
 * Each test creates its own project to keep state isolated.
 * Task titles are unique per run to avoid collisions.
 *
 * Note on drag-and-drop:
 *   @dnd-kit uses PointerSensor with activationConstraint: { distance: 5 }.
 *   Playwright's dragTo() dispatches pointer events with sufficient movement
 *   to satisfy that constraint. The drop target is the column's droppable area,
 *   identified by its aria-label via the region role.
 */

test.describe('Kanban board — FR-030, FR-040, FR-041', () => {
  /**
   * Helper: creates a throw-away project and returns its numeric id,
   * extracted from the URL after navigation to the project detail page.
   */
  async function createTestProject(page: Page): Promise<number> {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();

    const projectName = `E2E Kanban Project ${Date.now()}`;
    await projectsPage.openCreateModal();
    await projectsPage.fillAndSubmitCreateForm(projectName, 'software');

    // Wait for the modal to close and the new card to appear
    await expect(projectsPage.modal).not.toBeVisible({ timeout: 10_000 });

    // Click the newly created project card to navigate to its detail page
    const card = projectsPage.projectCardByName(projectName);
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.click();

    // URL is now /projects/:id — extract the numeric id
    await page.waitForURL(/\/projects\/\d+/, { timeout: 10_000 });
    const url = page.url();
    const match = url.match(/\/projects\/(\d+)/);
    if (!match || !match[1]) {
      throw new Error(`Could not extract project id from URL: ${url}`);
    }
    return Number(match[1]);
  }

  test('should add a task via quick-add and show the card in the To Do column', async ({ authenticatedPage }) => {
    const projectId = await createTestProject(authenticatedPage);
    const kanbanPage = new KanbanPage(authenticatedPage);

    await kanbanPage.goto(projectId);

    const taskTitle = `Quick Add Task ${Date.now()}`;
    await kanbanPage.quickAddTask('todo', taskTitle);

    // The task card should now be visible in the To Do column
    const card = kanbanPage.taskCardsInColumn('todo').filter({ hasText: taskTitle });
    await expect(card).toBeVisible({ timeout: 15_000 });
  });

  test('should move a task to the Done column by dragging', async ({ authenticatedPage }) => {
    const projectId = await createTestProject(authenticatedPage);
    const kanbanPage = new KanbanPage(authenticatedPage);

    await kanbanPage.goto(projectId);

    // Create a task in the To Do column first
    const taskTitle = `Drag To Done Task ${Date.now()}`;
    await kanbanPage.quickAddTask('todo', taskTitle);

    // Confirm the card is in To Do
    const card = kanbanPage.taskCardsInColumn('todo').filter({ hasText: taskTitle });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Drag the card to the Done column
    // The Done column section has aria-label "Done column"
    const doneColumn = kanbanPage.column('done');
    await expect(doneColumn).toBeVisible();

    await card.dragTo(doneColumn, {
      // Move slowly enough for @dnd-kit's 5px activation threshold
      sourcePosition: { x: 100, y: 20 },
    });

    // After the optimistic update and API call, the card should be in Done
    // Wait for the card to disappear from To Do
    await expect(card).not.toBeVisible({ timeout: 10_000 });

    // And appear in the Done column
    const cardInDone = kanbanPage.taskCardsInColumn('done').filter({ hasText: taskTitle });
    await expect(cardInDone).toBeVisible({ timeout: 10_000 });
  });
});
