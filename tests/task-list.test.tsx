import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load } from "./helpers/load";
import { json,stubFetch, TASK_A, TASK_B } from "./helpers/tasks";

beforeEach(() => {
  vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const LOAD_FAILED = "Tasks could not be loaded. Try again later.";

describe("TaskList (app/_components/task-list)", () => {
  it("AC-001.1 lists A before B with title and due date, or 'No due date'", async () => {
    stubFetch(() => json(200, [TASK_A, TASK_B]));
    const { TaskList } = await load<typeof import("@/app/_components/task-list")>("@/app/_components/task-list");
    render(await TaskList());
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("A")).toBeInTheDocument();
    expect(within(items[0]).getByText("2026-12-24")).toBeInTheDocument();
    expect(within(items[1]).getByText("B")).toBeInTheDocument();
    expect(within(items[1]).getByText(/No due date/)).toBeInTheDocument();
    expect(within(items[1]).queryByText("2026-12-24")).not.toBeInTheDocument();
  });

  it("AC-001.1 shows a date as a <time> element carrying the date", async () => {
    const { TaskListView } = await load<typeof import("@/app/_components/task-list")>("@/app/_components/task-list");
    const { container } = render(<TaskListView result={{ ok: true, tasks: [TASK_A] }} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-12-24");
    expect(time).toHaveTextContent("2026-12-24");
  });

  it("AC-001.2 shows 'No tasks yet' instead of a list for []", async () => {
    stubFetch(() => json(200, []));
    const { TaskList } = await load<typeof import("@/app/_components/task-list")>("@/app/_components/task-list");
    render(await TaskList());
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("AC-001.7 shows the load error instead of the list for a non-200, a non-array and a network error", async () => {
    const { TaskList } = await load<typeof import("@/app/_components/task-list")>("@/app/_components/task-list");
    for (const make of [
      () => json(503, { detail: "task store unavailable" }),
      () => json(200, { not: "an array" }),
      () => Promise.reject(new TypeError("fetch failed")),
      () => Promise.reject(new DOMException("timed out", "TimeoutError")),
    ]) {
      stubFetch(make);
      const { unmount } = render(await TaskList());
      expect(screen.getByText(LOAD_FAILED)).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.queryByText("No tasks yet")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("AC-001.7 TaskListView renders the load error for ok: false", async () => {
    const { TaskListView, MSG_LOAD_FAILED } = await load<typeof import("@/app/_components/task-list")>("@/app/_components/task-list");
    expect(MSG_LOAD_FAILED).toBe(LOAD_FAILED);
    render(<TaskListView result={{ ok: false }} />);
    expect(screen.getByText(LOAD_FAILED)).toBeInTheDocument();
  });
});
