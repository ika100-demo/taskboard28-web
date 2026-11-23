import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load } from "./helpers/load";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("[]", { status: 200 })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("start page (app/page)", () => {
  it("AC-001.2 is rendered on demand and holds the heading, the create form and the task list sections", async () => {
    const page = await load<typeof import("@/app/page")>("@/app/page");
    expect(page.dynamic).toBe("force-dynamic");
    const Page = page.default;
    render(<Page />);
    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Tasks" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { level: 2, name: "New task" })).toBeInTheDocument();
    expect(within(main).getByRole("heading", { level: 2, name: "All tasks" })).toBeInTheDocument();
    expect(within(main).getByLabelText("Title")).toBeInTheDocument();
  });
});
