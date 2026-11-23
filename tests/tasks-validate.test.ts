import { describe, expect, it } from "vitest";

import { load } from "./helpers/load";

describe("task validation (lib/tasks/validate)", () => {
  it("AC-001.4 rejects an empty or whitespace-only title with 'Title is required'", async () => {
    const { validateTask, MSG_TITLE_REQUIRED } = await load<typeof import("@/lib/tasks/validate")>("@/lib/tasks/validate");
    expect(MSG_TITLE_REQUIRED).toBe("Title is required");
    expect(validateTask({ title: "", due_date: null })).toEqual({ title: "Title is required" });
    expect(validateTask({ title: "   \t ", due_date: null })).toEqual({ title: "Title is required" });
    expect(validateTask({ due_date: null })).toEqual({ title: "Title is required" });
  });

  it("AC-001.4 rejects a title over 200 characters after trimming, accepts exactly 200", async () => {
    const { validateTask } = await load<typeof import("@/lib/tasks/validate")>("@/lib/tasks/validate");
    expect(validateTask({ title: "x".repeat(201) })).toEqual({ title: "Title must be at most 200 characters" });
    expect(validateTask({ title: `  ${"x".repeat(200)}  ` })).toEqual({});
    expect(validateTask({ title: "x" })).toEqual({});
  });

  it("AC-001.3 toNewTask trims the title and maps an empty date to null", async () => {
    const { toNewTask } = await load<typeof import("@/lib/tasks/validate")>("@/lib/tasks/validate");
    expect(toNewTask("  Buy milk ", "2026-12-24")).toEqual({ title: "Buy milk", due_date: "2026-12-24" });
    expect(toNewTask("Buy milk", "")).toEqual({ title: "Buy milk", due_date: null });
  });

  it("AC-001.6 and AC-001.8 export the site's messages", async () => {
    const v = await load<typeof import("@/lib/tasks/validate")>("@/lib/tasks/validate");
    expect(v.MSG_LIMIT).toBe("The task limit of 1000 is reached");
    expect(v.MSG_SAVE_FAILED).toBe("The task could not be saved. Try again.");
  });
});
