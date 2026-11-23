import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load } from "./helpers/load";
import { json,posts, stubFetch, TASK_A } from "./helpers/tasks";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

beforeEach(() => {
  revalidatePath.mockClear();
  vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("createTaskAction (app/_actions/create-task)", () => {
  it("AC-001.3 creates the task, revalidates the start page and returns created", async () => {
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const { createTaskAction } = await load<typeof import("@/app/_actions/create-task")>("@/app/_actions/create-task");
    expect(await createTaskAction({ title: "  Buy milk ", due_date: "2026-12-24" })).toEqual({ status: "created" });
    expect(JSON.parse(String((posts(fetchMock)[0][1] as RequestInit).body))).toEqual({
      title: "Buy milk",
      due_date: "2026-12-24",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("AC-001.3 after the action, listTasks returns the new task last with its due date or null", async () => {
    const stored = [TASK_A];
    stubFetch((_url, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { title: string; due_date: string | null };
        const task = { id: "new", created_at: "2026-11-23T11:00:00Z", ...body };
        stored.push(task);
        return json(201, task);
      }
      return json(200, stored);
    });
    const { createTaskAction } = await load<typeof import("@/app/_actions/create-task")>("@/app/_actions/create-task");
    const { listTasks } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    await createTaskAction({ title: "Buy milk", due_date: "" });
    const result = await listTasks();
    expect(result.ok && result.tasks.map((t) => [t.title, t.due_date])).toEqual([
      ["A", "2026-12-24"],
      ["Buy milk", null],
    ]);
  });

  it("AC-001.4 re-validates on the server: no POST and the site's message for a bad title", async () => {
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const { createTaskAction } = await load<typeof import("@/app/_actions/create-task")>("@/app/_actions/create-task");
    expect(await createTaskAction({ title: "   ", due_date: "" })).toEqual({
      status: "error",
      fieldErrors: { title: "Title is required" },
    });
    expect(await createTaskAction({ title: "x".repeat(201), due_date: "" })).toEqual({
      status: "error",
      fieldErrors: { title: "Title must be at most 200 characters" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("AC-001.5 returns the 422 msg as a title field error", async () => {
    stubFetch(() => json(422, { detail: [{ loc: ["body", "title"], type: "t", msg: "API says no" }] }));
    const { createTaskAction } = await load<typeof import("@/app/_actions/create-task")>("@/app/_actions/create-task");
    expect(await createTaskAction({ title: "ok", due_date: "" })).toEqual({
      status: "error",
      fieldErrors: { title: "API says no" },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("AC-001.6 returns the limit message as the form error", async () => {
    stubFetch(() => json(409, { detail: "task limit of 1000 reached" }));
    const { createTaskAction } = await load<typeof import("@/app/_actions/create-task")>("@/app/_actions/create-task");
    expect(await createTaskAction({ title: "ok", due_date: "" })).toEqual({
      status: "error",
      fieldErrors: {},
      formError: "The task limit of 1000 is reached",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("AC-001.8 returns the save-failed message for 503 and a network error", async () => {
    const { createTaskAction } = await load<typeof import("@/app/_actions/create-task")>("@/app/_actions/create-task");
    for (const make of [() => json(503, {}), () => Promise.reject(new TypeError("fetch failed"))]) {
      stubFetch(make);
      expect(await createTaskAction({ title: "ok", due_date: "" })).toEqual({
        status: "error",
        fieldErrors: {},
        formError: "The task could not be saved. Try again.",
      });
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
