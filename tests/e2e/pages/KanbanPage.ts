import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Kanban Board page (/projects/:projectId/kanban).
 *
 * Relevant data-testid values:
 *   KanbanColumn.tsx:
 *     - add-task-{status}        → "Add task" button per column (e.g. add-task-todo)
 *   QuickAddTaskForm.tsx:
 *     - quick-add-task-form      → the inline add form
 *     - quick-add-task-input     → title input inside the form
 *     - quick-add-task-submit    → submit button inside the form
 *   TaskCard.tsx:
 *     - task-card                → individual task card article element
 *
 * Column droppable ids (used as aria-labels):
 *   'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
 *   Column sections have aria-label "{Label} column", e.g. "To Do column"
 */
export class KanbanPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly board: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Kanban Board', level: 1 });
    // The board container has aria-label "Kanban board"
    this.board = page.getByRole('list', { name: 'Kanban board' });
  }

  async goto(projectId: number) {
    await this.page.goto(`/projects/${projectId}/kanban`);
    await this.heading.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /**
   * Returns the column section locator by its status label.
   * Column sections have aria-label "{Label} column".
   */
  column(
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  ): Locator {
    const labels: Record<string, string> = {
      todo: 'To Do column',
      in_progress: 'In Progress column',
      in_review: 'In Review column',
      done: 'Done column',
      blocked: 'Blocked column',
    };
    return this.page.getByRole('region', { name: labels[status] });
  }

  /** Returns the "Add task" button for a given column status. */
  addTaskButton(status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'): Locator {
    return this.page.getByTestId(`add-task-${status}`);
  }

  /** Returns the quick-add task form (visible after clicking the add button). */
  get quickAddForm(): Locator {
    return this.page.getByTestId('quick-add-task-form');
  }

  /** Returns the title input inside the quick-add form. */
  get quickAddInput(): Locator {
    return this.page.getByTestId('quick-add-task-input');
  }

  /** Returns the submit button inside the quick-add form. */
  get quickAddSubmit(): Locator {
    return this.page.getByTestId('quick-add-task-submit');
  }

  /**
   * Opens the quick-add form on a column, types a task title, and submits.
   * Waits for the form to disappear (success) before returning.
   */
  async quickAddTask(
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked',
    title: string
  ) {
    await this.addTaskButton(status).click();
    await this.quickAddForm.waitFor({ state: 'visible' });
    await this.quickAddInput.fill(title);
    await this.quickAddSubmit.click();
    // Form closes on success
    await this.quickAddForm.waitFor({ state: 'hidden', timeout: 10_000 });
  }

  /**
   * Returns all task cards in a specific column.
   * Cards have data-testid="task-card" and are children of the column.
   */
  taskCardsInColumn(
    status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  ): Locator {
    return this.column(status).getByTestId('task-card');
  }

  /**
   * Returns a task card locator matching the given title text anywhere in the board.
   */
  taskCardByTitle(title: string): Locator {
    return this.page
      .getByTestId('task-card')
      .filter({ hasText: title });
  }

  /**
   * Drags a task card to the target column using Playwright's dragTo().
   * @param taskTitle  The visible text of the task to drag.
   * @param toStatus   The column to drop it into.
   */
  async dragTaskToColumn(
    taskTitle: string,
    toStatus: 'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'
  ) {
    const card = this.taskCardByTitle(taskTitle);
    const targetColumn = this.column(toStatus);
    await card.dragTo(targetColumn);
  }
}
