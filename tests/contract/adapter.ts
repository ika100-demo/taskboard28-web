// Project-owned: wires the contract check (tests/contract.test.ts) to the create form (spec 110).
// Modules are imported lazily so that a missing module fails the contract cases, not the collection.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { vi } from "vitest";

import type { ContractAdapter } from "@/lib/contract/engine";

import { load } from "../helpers/load";

const text = (id: string) => document.getElementById(id)?.textContent ?? "";

export const adapter: ContractAdapter = {
  base: () => ({ title: "valid title", due_date: null }),
  validate: async (_endpoint, body) => {
    const { validateTask } = await load<typeof import("@/lib/tasks/validate")>("@/lib/tasks/validate");
    return validateTask(body) as Record<string, string>;
  },
  showResponse: async (_endpoint, response) => {
    vi.stubEnv("TASKBOARD28_API_URL", "http://taskboard28-api");
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(response.body), { status: response.status })),
    );
    try {
      const { TaskForm } = await load<typeof import("@/app/_components/task-form")>("@/app/_components/task-form");
      render(createElement(TaskForm));
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "valid title" } });
      fireEvent.click(screen.getByRole("button", { name: "Add task" }));
      await waitFor(() => {
        if (!text("task-title-error") && !text("task-form-error")) throw new Error("no message shown yet");
      });
      const fields: Record<string, string> = {};
      if (text("task-title-error")) fields.title = text("task-title-error");
      if (text("task-due-date-error")) fields.due_date = text("task-due-date-error");
      const form = text("task-form-error");
      return form ? { fields, form } : { fields };
    } finally {
      cleanup();
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.doUnmock("next/cache");
    }
  },
};
