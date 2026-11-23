"use server";

import { revalidatePath } from "next/cache";

import { createTask } from "@/lib/tasks/api";
import type { FieldErrors } from "@/lib/tasks/types";
import { MSG_LIMIT, MSG_SAVE_FAILED, toNewTask, validateTask } from "@/lib/tasks/validate";

export type CreateTaskState =
  | { status: "created" }
  | { status: "error"; fieldErrors: FieldErrors; formError?: string };

export async function createTaskAction(input: { title: string; due_date: string }): Promise<CreateTaskState> {
  const title = typeof input?.title === "string" ? input.title : "";
  const dueDate = typeof input?.due_date === "string" ? input.due_date : "";
  const errors = validateTask({ title, due_date: dueDate });
  if (Object.keys(errors).length > 0) return { status: "error", fieldErrors: errors };

  const result = await createTask(toNewTask(title, dueDate));
  switch (result.kind) {
    case "created":
      revalidatePath("/");
      return { status: "created" };
    case "invalid":
      return { status: "error", fieldErrors: result.fieldErrors };
    case "limit":
      return { status: "error", fieldErrors: {}, formError: MSG_LIMIT };
    case "failed":
      return { status: "error", fieldErrors: {}, formError: MSG_SAVE_FAILED };
  }
}
