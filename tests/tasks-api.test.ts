import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load } from "./helpers/load";
import { json,postBody, posts, stubFetch, TASK_A, TASK_B } from "./helpers/tasks";

beforeEach(() => {
  vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("listTasks (lib/tasks/api)", () => {
  it("AC-001.1 returns the tasks in the order received, from GET {base}/tasks", async () => {
    const fetchMock = stubFetch(() => json(200, [TASK_A, TASK_B]));
    const { listTasks } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    expect(await listTasks()).toEqual({ ok: true, tasks: [TASK_A, TASK_B] });
    expect(fetchMock.mock.calls[0][0]).toBe("http://taskboard28-api/tasks");
  });

  it("AC-001.2 returns an empty list for []", async () => {
    stubFetch(() => json(200, []));
    const { listTasks } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    expect(await listTasks()).toEqual({ ok: true, tasks: [] });
  });

  it("AC-001.7 fails on a non-200 answer, a non-array body, a bad element, or invalid JSON", async () => {
    const { listTasks } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    for (const make of [
      () => json(503, { detail: "task store unavailable" }),
      () => json(500, []),
      () => json(200, { tasks: [] }),
      () => json(200, [{ id: 1 }]),
      () => new Response("<html>", { status: 200 }),
    ]) {
      stubFetch(make);
      expect(await listTasks()).toEqual({ ok: false });
    }
  });

  it("AC-001.7 fails on a network error, a timeout and a missing TASKBOARD28_API_URL", async () => {
    const { listTasks } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    stubFetch(() => Promise.reject(new TypeError("fetch failed")));
    expect(await listTasks()).toEqual({ ok: false });
    stubFetch(() => Promise.reject(new DOMException("timed out", "TimeoutError")));
    expect(await listTasks()).toEqual({ ok: false });
    vi.stubEnv("TASKBOARD28_API_URL", "");
    const fetchMock = stubFetch(() => json(200, []));
    expect(await listTasks()).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AC-001.7 gives GET /tasks a 10 second timeout signal and no cache", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = stubFetch(() => json(200, []));
    const { listTasks, API_TIMEOUT_MS } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    await listTasks();
    expect(API_TIMEOUT_MS).toBe(10_000);
    expect(timeout).toHaveBeenCalledWith(10_000);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-store");
  });
});

describe("createTask (lib/tasks/api)", () => {
  it("AC-001.3 POSTs {title, due_date} as JSON and maps 201 to created", async () => {
    const fetchMock = stubFetch(() => json(201, { ...TASK_A, title: "Buy milk" }));
    const { createTask } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    expect(await createTask({ title: "Buy milk", due_date: "2026-12-24" })).toEqual({ kind: "created" });
    const [call] = posts(fetchMock);
    expect(call[0]).toBe("http://taskboard28-api/tasks");
    expect(postBody(call)).toEqual({ title: "Buy milk", due_date: "2026-12-24" });
    expect(new Headers((call[1] as RequestInit).headers).get("content-type")).toBe("application/json");
    await createTask({ title: "Buy milk", due_date: null });
    expect(postBody(posts(fetchMock)[1])).toEqual({ title: "Buy milk", due_date: null });
  });

  it("AC-001.5 maps 422 to the msg of the title item, taking the last element of loc", async () => {
    stubFetch(() =>
      json(422, {
        detail: [{ loc: ["body", "title"], type: "string_too_short", msg: "String should have at least 1 character" }],
      }),
    );
    const { createTask } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    expect(await createTask({ title: "x", due_date: null })).toEqual({
      kind: "invalid",
      fieldErrors: { title: "String should have at least 1 character" },
    });
    stubFetch(() => json(422, { detail: [{ loc: "title", type: "x", msg: "plain loc" }] }));
    expect(await createTask({ title: "x", due_date: null })).toEqual({
      kind: "invalid",
      fieldErrors: { title: "plain loc" },
    });
  });

  it("AC-001.5 maps a due_date item to fieldErrors.due_date and an unusable 422 to failed", async () => {
    const { createTask } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    stubFetch(() => json(422, { detail: [{ loc: ["body", "due_date"], type: "date", msg: "bad date" }] }));
    expect(await createTask({ title: "x", due_date: "nope" })).toEqual({
      kind: "invalid",
      fieldErrors: { due_date: "bad date" },
    });
    stubFetch(() => json(422, { detail: "nothing usable" }));
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "failed" });
  });

  it("AC-001.6 maps 409 to limit", async () => {
    stubFetch(() => json(409, { detail: "task limit of 1000 reached" }));
    const { createTask } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "limit" });
  });

  it("AC-001.8 maps 503, 500, a network error and a timeout to failed, without retry", async () => {
    const { createTask } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    for (const make of [
      () => json(503, { detail: "task store unavailable" }),
      () => json(500, {}),
      () => new Response("not json", { status: 502 }),
      () => Promise.reject(new TypeError("fetch failed")),
      () => Promise.reject(new DOMException("timed out", "TimeoutError")),
    ]) {
      const fetchMock = stubFetch(make);
      expect(await createTask({ title: "x", due_date: null })).toEqual({ kind: "failed" });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("AC-001.8 gives POST /tasks a 10 second timeout signal", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const { createTask } = await load<typeof import("@/lib/tasks/api")>("@/lib/tasks/api");
    await createTask({ title: "x", due_date: null });
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal).toBeInstanceOf(AbortSignal);
  });
});
