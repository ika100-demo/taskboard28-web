import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

vi.mock("@/lib/tasks/api", () => ({ listTasks: vi.fn(async () => ({ ok: true, tasks: [] })) }));
vi.mock("@/app/_actions/create-task", () => ({ createTaskAction: vi.fn() }));

describe("HomePage", () => {
  it("owns the main landmark the skip link targets", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });

  it("renders a single Tasks heading", () => {
    render(<HomePage />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Tasks");
  });

  it("orders the sections New task then All tasks", () => {
    render(<HomePage />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["New task", "All tasks"]);
  });

  it("shows the new task form", () => {
    render(<HomePage />);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add task" })).toBeInTheDocument();
  });
});
