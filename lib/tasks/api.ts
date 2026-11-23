import { logger } from "@/lib/logger";

import type { FieldErrors, NewTask, Task } from "./types";

export type ListTasksResult = { ok: true; tasks: Task[] } | { ok: false };
export type CreateTaskResult =
  | { kind: "created" }
  | { kind: "invalid"; fieldErrors: FieldErrors }
  | { kind: "limit" }
  | { kind: "failed" };

export const API_TIMEOUT_MS = 10_000;

type Reason = "status" | "body" | "network" | "timeout" | "config";
type Endpoint = "GET /tasks" | "POST /tasks";
type Outcome = { response: Response } | { reason: Reason };

function warn(endpoint: Endpoint, reason: Reason, status?: number): void {
  logger.warn("taskboard28-api call failed", { endpoint, status, reason });
}

async function call(endpoint: Endpoint, init: RequestInit): Promise<Outcome> {
  const base = process.env.TASKBOARD28_API_URL?.replace(/\/+$/, "");
  if (!base) {
    warn(endpoint, "config");
    return { reason: "config" };
  }
  try {
    const response = await fetch(`${base}/tasks`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    return { response };
  } catch (error) {
    const reason: Reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network";
    warn(endpoint, reason);
    return { reason };
  }
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.title === "string" &&
    typeof t.created_at === "string" &&
    (typeof t.due_date === "string" || t.due_date === null)
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export async function listTasks(): Promise<ListTasksResult> {
  const endpoint = "GET /tasks";
  const outcome = await call(endpoint, { method: "GET" });
  if (!("response" in outcome)) return { ok: false };
  const { response } = outcome;
  if (response.status !== 200) {
    warn(endpoint, "status", response.status);
    return { ok: false };
  }
  const body = await readJson(response);
  if (!Array.isArray(body) || !body.every(isTask)) {
    warn(endpoint, "body", response.status);
    return { ok: false };
  }
  return { ok: true, tasks: body };
}

function fieldErrorsFrom(body: unknown): FieldErrors {
  const detail = (body as { detail?: unknown } | undefined)?.detail;
  const errors: FieldErrors = {};
  if (!Array.isArray(detail)) return errors;
  for (const item of detail) {
    if (typeof item !== "object" || item === null) continue;
    const { loc, msg } = item as { loc?: unknown; msg?: unknown };
    const last: unknown = Array.isArray(loc) ? loc[loc.length - 1] : loc;
    if ((last === "title" || last === "due_date") && typeof msg === "string" && errors[last] === undefined) {
      errors[last] = msg;
    }
  }
  return errors;
}

export async function createTask(task: NewTask): Promise<CreateTaskResult> {
  const endpoint = "POST /tasks";
  const outcome = await call(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: task.title, due_date: task.due_date }),
  });
  if (!("response" in outcome)) return { kind: "failed" };
  const { response } = outcome;
  if (response.status === 201) return { kind: "created" };
  if (response.status === 409) {
    warn(endpoint, "status", response.status);
    return { kind: "limit" };
  }
  if (response.status === 422) {
    const fieldErrors = fieldErrorsFrom(await readJson(response));
    if (Object.keys(fieldErrors).length > 0) return { kind: "invalid", fieldErrors };
    warn(endpoint, "body", response.status);
    return { kind: "failed" };
  }
  warn(endpoint, "status", response.status);
  return { kind: "failed" };
}
