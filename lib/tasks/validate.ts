import type { FieldErrors, NewTask } from "./types";

export const TITLE_MAX = 200;
export const MSG_TITLE_REQUIRED = "Title is required";
export const MSG_TITLE_TOO_LONG = "Title must be at most 200 characters";
export const MSG_LIMIT = "The task limit of 1000 is reached";
export const MSG_SAVE_FAILED = "The task could not be saved. Try again.";

/** The site's own check, before anything is sent. Accepts any body shape. */
export function validateTask(body: { title?: unknown; due_date?: unknown }): FieldErrors {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title === "") return { title: MSG_TITLE_REQUIRED };
  if (title.length > TITLE_MAX) return { title: MSG_TITLE_TOO_LONG };
  return {};
}

/** Trimmed title, and the date input's value with "" -> null. */
export function toNewTask(title: string, dueDate: string): NewTask {
  return { title: title.trim(), due_date: dueDate === "" ? null : dueDate };
}
