import { expect, test } from "@playwright/test";

test.skip(!process.env.SMOKE_BASE_URL, "SMOKE_BASE_URL not set");

// Read-only: the start page loads with its form and shows a list, the empty text or the load error.
test("AC-001.2 the start page shows the create form and the task area @smoke", async ({ page }) => {
  await page.goto("/");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible();
  await expect(main.getByLabel("Title")).toBeVisible();
  await expect(main.getByRole("button", { name: "Add task" })).toBeVisible();
  await expect(
    main
      .getByRole("list")
      .or(main.getByText("No tasks yet"))
      .or(main.getByText("Tasks could not be loaded. Try again later.")),
  ).toBeVisible();
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
