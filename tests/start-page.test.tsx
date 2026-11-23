import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load } from "./helpers/load";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function renderPage() {
  const page = await load<typeof import("@/app/page")>("@/app/page");
  const Page = page.default;
  render(<Page />);
  return { page, main: screen.getByRole("main") };
}

describe("start page (app/page)", () => {
  it("AC-001.2 is rendered on demand and holds the heading, the create form and the task list sections", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { page, main } = await renderPage();
    expect(page.dynamic).toBe("force-dynamic");
    expect(within(main).getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { level: 2, name: "New task" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
    expect(within(main).getByLabelText("Title")).toBeInTheDocument();
  });

  it("AC-001.2 shows 'No tasks yet' together with the create form when the API returns []", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const { main } = await renderPage();
    expect(await within(main).findByText("No tasks yet")).toBeInTheDocument();
    expect(within(main).queryByRole("list")).not.toBeInTheDocument();
    expect(within(main).getByLabelText("Title")).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "Add task" })).toBeInTheDocument();
  });

  it("AC-001.7 shows the load error together with the create form when the API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("fetch failed"))),
    );
    const { main } = await renderPage();
    expect(await within(main).findByText("Tasks could not be loaded. Try again later.")).toBeInTheDocument();
    expect(within(main).queryByRole("list")).not.toBeInTheDocument();
    expect(within(main).getByLabelText("Title")).toBeInTheDocument();
    expect(within(main).getByRole("button", { name: "Add task" })).toBeInTheDocument();
  });
});
