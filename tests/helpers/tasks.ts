// Shared helpers for the 001 acceptance tests: a stubbed taskboard28-api over `fetch`.
import { vi } from "vitest";

export interface TaskJson {
  id: string;
  title: string;
  due_date: string | null;
  created_at: string;
}

export const TASK_A: TaskJson = { id: "a", title: "A", due_date: "2026-12-24", created_at: "2026-11-23T10:00:00Z" };
export const TASK_B: TaskJson = { id: "b", title: "B", due_date: null, created_at: "2026-11-23T10:01:00Z" };

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

type Handler = (url: string, init: RequestInit | undefined) => Response | Promise<Response>;

/** Stubs global fetch; every call goes to `handler`. Returns the mock. */
export function stubFetch(handler: Handler) {
  const mock = vi.fn(async (input: unknown, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", mock);
  return mock;
}

export function posts(mock: ReturnType<typeof stubFetch>) {
  return mock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
}

export function postBody(call: unknown[]): unknown {
  return JSON.parse(String((call[1] as RequestInit).body));
}
