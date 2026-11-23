import { expect, test } from "@playwright/test";

test.skip(!process.env.SMOKE_BASE_URL, "SMOKE_BASE_URL not set");

// Read-only smoke check only: the page loads with its form and a task area (list or empty text);
// it does not check which of the two, because staging and prod data are not ours.
test("AC-001.2 the start page shows the create form and the task area @smoke", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
  await expect(main.getByLabel("Title")).toBeVisible();
  await expect(main.getByRole("button", { name: "Add task" })).toBeVisible();
  // The task area must be a real list or the empty state; the load-error text is a failure
  // (API unreachable or TASKBOARD28_API_URL unset).
  await expect(main.getByRole("list").or(main.getByText("No tasks yet"))).toBeVisible();
  await expect(main.getByText("Tasks could not be loaded")).toHaveCount(0);
});

// Writes a task of its own: only in dev.
test("AC-001.3 a person adds a task and sees it last in the list @smoke @writes", async ({ page }) => {
  const title = `smoke-${crypto.randomUUID()}`;
  await page.goto("/");
  const main = page.getByRole("main");
  await main.getByLabel("Title").fill(title);
  await main.getByLabel("Due date (optional)").fill("2026-12-24");
  await main.getByRole("button", { name: "Add task" }).click();
  await expect(main.getByRole("listitem").last()).toContainText(title);
  await expect(main.getByRole("listitem").last()).toContainText("2026-12-24");
  await expect(main.getByLabel("Title")).toHaveValue("");
});
