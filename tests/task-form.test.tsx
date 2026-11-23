import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load } from "./helpers/load";
import { json,postBody, posts, stubFetch, TASK_A } from "./helpers/tasks";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function renderForm() {
  const { TaskForm } = await load<typeof import("@/app/_components/task-form")>("@/app/_components/task-form");
  render(<TaskForm />);
  return {
    title: screen.getByLabelText("Title") as HTMLInputElement,
    due: screen.getByLabelText("Due date (optional)") as HTMLInputElement,
    submit: screen.getByRole("button", { name: "Add task" }),
  };
}

function fill(f: { title: HTMLInputElement; due: HTMLInputElement }, title: string, due = "") {
  fireEvent.change(f.title, { target: { value: title } });
  fireEvent.change(f.due, { target: { value: due } });
}

describe("TaskForm (app/_components/task-form)", () => {
  it("AC-001.2 renders the create form with a title and an optional date input", async () => {
    const f = await renderForm();
    expect(f.title).toHaveAttribute("name", "title");
    expect(f.due).toHaveAttribute("type", "date");
    expect(f.submit).toBeInTheDocument();
  });

  it("AC-001.3 sends the trimmed title and the date, then clears the form", async () => {
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const f = await renderForm();
    fill(f, "  Buy milk ", "2026-12-24");
    fireEvent.click(f.submit);
    await waitFor(() => expect(f.title.value).toBe(""));
    expect(f.due.value).toBe("");
    expect(postBody(posts(fetchMock)[0])).toEqual({ title: "Buy milk", due_date: "2026-12-24" });
    expect(await screen.findByText("Task added.")).toBeInTheDocument();
  });

  it("AC-001.3 sends due_date null when the date is left empty", async () => {
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const f = await renderForm();
    fill(f, "Buy milk");
    fireEvent.click(f.submit);
    await waitFor(() => expect(posts(fetchMock)).toHaveLength(1));
    expect(postBody(posts(fetchMock)[0])).toEqual({ title: "Buy milk", due_date: null });
  });

  it("AC-001.4 shows 'Title is required' for empty and whitespace titles, keeps values, sends nothing", async () => {
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const f = await renderForm();
    fill(f, "   ", "2026-12-24");
    fireEvent.click(f.submit);
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(f.title.value).toBe("   ");
    expect(f.due.value).toBe("2026-12-24");
    expect(f.title).toHaveAttribute("aria-invalid", "true");
    fill(f, "");
    fireEvent.click(f.submit);
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it("AC-001.4 shows the 200-character message for a longer title, keeps values, sends nothing", async () => {
    const fetchMock = stubFetch(() => json(201, TASK_A));
    const f = await renderForm();
    const long = "x".repeat(201);
    fill(f, long, "2026-12-24");
    fireEvent.click(f.submit);
    expect(await screen.findByText("Title must be at most 200 characters")).toBeInTheDocument();
    expect(f.title.value).toBe(long);
    expect(f.due.value).toBe("2026-12-24");
    expect(posts(fetchMock)).toHaveLength(0);
  });

  it("AC-001.5 shows the msg of a 422 title item next to the title and keeps the values", async () => {
    stubFetch(() => json(422, { detail: [{ loc: ["body", "title"], type: "t", msg: "Title is odd" }] }));
    const f = await renderForm();
    fill(f, "Buy milk", "2026-12-24");
    fireEvent.click(f.submit);
    const msg = await screen.findByText("Title is odd");
    expect(msg).toHaveAttribute("id", "task-title-error");
    expect(f.title).toHaveAttribute("aria-describedby", "task-title-error");
    expect(f.title.value).toBe("Buy milk");
    expect(f.due.value).toBe("2026-12-24");
  });

  it("AC-001.6 shows the task limit message on a 409 and keeps the values", async () => {
    stubFetch(() => json(409, { detail: "task limit of 1000 reached" }));
    const f = await renderForm();
    fill(f, "Buy milk", "2026-12-24");
    fireEvent.click(f.submit);
    expect(await screen.findByText("The task limit of 1000 is reached")).toBeInTheDocument();
    expect(f.title.value).toBe("Buy milk");
    expect(f.due.value).toBe("2026-12-24");
  });

  it("AC-001.8 shows 'The task could not be saved. Try again.' on 503, 500 and network errors, keeping values", async () => {
    for (const make of [
      () => json(503, { detail: "task store unavailable" }),
      () => json(500, {}),
      () => Promise.reject(new TypeError("fetch failed")),
      () => Promise.reject(new DOMException("timed out", "TimeoutError")),
    ]) {
      stubFetch(make);
      const f = await renderForm();
      fill(f, "Buy milk", "2026-12-24");
      fireEvent.click(f.submit);
      expect(await screen.findByText("The task could not be saved. Try again.")).toBeInTheDocument();
      expect(f.title.value).toBe("Buy milk");
      expect(f.due.value).toBe("2026-12-24");
      cleanup();
    }
  });

  it("AC-001.8 a new attempt clears the earlier message", async () => {
    let status = 503;
    stubFetch(() => json(status, status === 201 ? TASK_A : {}));
    const f = await renderForm();
    fill(f, "Buy milk");
    fireEvent.click(f.submit);
    expect(await screen.findByText("The task could not be saved. Try again.")).toBeInTheDocument();
    status = 201;
    fireEvent.click(f.submit);
    await waitFor(() => expect(screen.queryByText("The task could not be saved. Try again.")).not.toBeInTheDocument());
  });
});
