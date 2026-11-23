export interface Task {
  id: string;
  title: string;
  due_date: string | null;
  created_at: string;
}

/** The title is already trimmed. */
export interface NewTask {
  title: string;
  due_date: string | null;
}

/** An empty object means valid. */
export type FieldErrors = Partial<Record<"title" | "due_date", string>>;
