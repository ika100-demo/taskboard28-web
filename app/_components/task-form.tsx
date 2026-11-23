"use client";

import { type FormEvent, useRef, useState } from "react";

import { createTaskAction } from "@/app/_actions/create-task";
import type { FieldErrors } from "@/lib/tasks/types";
import { validateTask } from "@/lib/tasks/validate";

type Messages = { title: string; dueDate: string; form: string };
const NONE: Messages = { title: "", dueDate: "", form: "" };

function fromErrors(errors: FieldErrors, formError?: string): Messages {
  // One message at a time: title before due date before form.
  if (errors.title) return { ...NONE, title: errors.title };
  if (errors.due_date) return { ...NONE, dueDate: errors.due_date };
  return { ...NONE, form: formError ?? "" };
}

export function TaskForm() {
  const [messages, setMessages] = useState<Messages>(NONE);
  const [pending, setPending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const pendingRef = useRef(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    const form = event.currentTarget;
    const values = { title: titleRef.current?.value ?? "", due_date: dueRef.current?.value ?? "" };
    setMessages(NONE);
    setAnnouncement("");

    const errors = validateTask(values);
    if (Object.keys(errors).length > 0) {
      setMessages(fromErrors(errors));
      titleRef.current?.focus();
      return;
    }

    pendingRef.current = true;
    setPending(true);
    try {
      const state = await createTaskAction(values);
      if (state.status === "created") {
        form.reset();
        setAnnouncement("Task added.");
        titleRef.current?.focus();
      } else {
        setMessages(fromErrors(state.fieldErrors, state.formError));
        if (state.fieldErrors.title) titleRef.current?.focus();
        else if (state.fieldErrors.due_date) dueRef.current?.focus();
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="task-form">
      <div className="field">
        <label htmlFor="task-title" className="field-label">
          Title
        </label>
        <input
          ref={titleRef}
          id="task-title"
          name="title"
          type="text"
          aria-invalid={messages.title ? "true" : undefined}
          aria-describedby={messages.title ? "task-title-error" : undefined}
        />
        <p id="task-title-error" role="alert" className="field-error">
          {messages.title}
        </p>
      </div>
      <div className="field">
        <label htmlFor="task-due-date" className="field-label">
          Due date (optional)
        </label>
        <input
          ref={dueRef}
          id="task-due-date"
          name="due_date"
          type="date"
          aria-invalid={messages.dueDate ? "true" : undefined}
          aria-describedby={messages.dueDate ? "task-due-date-error" : undefined}
        />
        <p id="task-due-date-error" role="alert" className="field-error">
          {messages.dueDate}
        </p>
      </div>
      <p id="task-form-error" role="alert" className="form-error">
        {messages.form}
      </p>
      <button type="submit" className="btn btn-primary" aria-disabled={pending ? "true" : undefined}>
        {pending ? "Adding…" : "Add task"}
      </button>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </form>
  );
}
