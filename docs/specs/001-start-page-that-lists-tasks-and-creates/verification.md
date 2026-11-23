# Verification — 001 Start page that lists tasks and creates them through taskboard28-api

**Result:** pass
**Commit:** cb0d60d · **Base:** 7a13317 (main) · **Trace:** 8/8 criteria named by tests

Test run (Phase 3): `devbox run ci` green (quality, test, security); `test-fast` green, 3x repeat green.

| Criterion | Verdict | Tests | Implementation | Notes |
|---|---|---|---|---|
| AC-001.1 | met | `tests/task-list.test.tsx::AC-001.1 lists A before B with title and due date, or 'No due date'`, `::AC-001.1 shows a date as a <time> element`, `tests/tasks-api.test.ts::AC-001.1 returns the tasks in the order received` | `lib/tasks/api.ts:61-76`, `app/_components/task-list.tsx:24-42`, `app/page.tsx:13-18,43` | Asserts 2 items, A then B, `2026-12-24` in A, "No due date" (and no date) in B. The list is rendered through `TaskList`; the page renders the same `TaskListView` with `listTasks()` (see Deviations). |
| AC-001.2 | met | `tests/start-page.test.tsx::AC-001.2 shows 'No tasks yet' together with the create form`, `tests/task-list.test.tsx::AC-001.2 shows 'No tasks yet' instead of a list`, `tests/tasks-api.test.ts::AC-001.2` | `app/_components/task-list.tsx:17-22`, `app/page.tsx:25-44` | Renders the real page: "No tasks yet", no `list` role, Title input and "Add task" button present. |
| AC-001.3 | met | `tests/task-form.test.tsx::AC-001.3 sends the trimmed title and the date, then clears the form`, `::AC-001.3 sends due_date null`, `::AC-001.3 after a 201 the refreshed list shows the new task last`, `tests/tasks-api.test.ts::AC-001.3 POSTs {title, due_date} as JSON`, `tests/create-task-action.test.ts::AC-001.3 creates the task, revalidates the start page`, `e2e/start-page.spec.ts::AC-001.3 ... @smoke @writes` | `app/_components/task-form.tsx:27-58`, `app/_actions/create-task.ts:13-23`, `lib/tasks/api.ts:93-102`, `lib/tasks/validate.ts:18-20` | Body asserted as parsed JSON for both date and `null`; both fields cleared; "Task added." announced. "Without leaving the page" rests on `revalidatePath("/")` (asserted) plus the e2e smoke in dev; the unit "refreshed list" test re-renders `TaskListView` from the stubbed store, not the page. |
| AC-001.4 | met | `tests/task-form.test.tsx::AC-001.4 shows 'Title is required' ...`, `::AC-001.4 shows the 200-character message ...`, `tests/tasks-validate.test.ts::AC-001.4` (x2), `tests/create-task-action.test.ts::AC-001.4 re-validates on the server` | `lib/tasks/validate.ts:10-15`, `app/_components/task-form.tsx:35-40,72-77` | `""` and `"   "` each with a fresh render; message in `#task-title-error`, wired by `aria-describedby`/`aria-invalid`; both values kept; 0 POSTs. 200 chars with padding accepted, 201 rejected. |
| AC-001.5 | met | `tests/task-form.test.tsx::AC-001.5 shows the msg of a 422 title item`, `tests/tasks-api.test.ts::AC-001.5` (x2), `tests/create-task-action.test.ts::AC-001.5` | `lib/tasks/api.ts:78-91,107-112`, `app/_actions/create-task.ts:24-25`, `app/_components/task-form.tsx:51-52` | API `msg` shown verbatim in `#task-title-error`; values kept; array and string `loc` both covered. |
| AC-001.6 | met | `tests/task-form.test.tsx::AC-001.6 shows the task limit message on a 409`, `tests/create-task-action.test.ts::AC-001.6`, `tests/tasks-api.test.ts::AC-001.6 maps 409 to limit` | `lib/tasks/api.ts:103-106`, `app/_actions/create-task.ts:26-27`, `lib/tasks/validate.ts:6` | Message shown, values kept, list still 2 items without "Buy milk"; `revalidatePath` not called. |
| AC-001.7 | met | `tests/start-page.test.tsx::AC-001.7 shows the load error together with the create form`, `tests/task-list.test.tsx::AC-001.7` (x2), `tests/tasks-api.test.ts::AC-001.7` (x3) | `lib/tasks/api.ts:22-40,61-76`, `app/_components/task-list.tsx:10-16` | 503, 500, non-array, bad element, non-JSON, network error, `TimeoutError`, unset URL all give `ok: false` and the exact text with no list; `AbortSignal.timeout(10_000)` and `cache: "no-store"` asserted. |
| AC-001.8 | met | `tests/task-form.test.tsx::AC-001.8 shows 'The task could not be saved. Try again.' on 503, 500 and network errors`, `::AC-001.8 a new attempt clears the earlier message`, `tests/tasks-api.test.ts::AC-001.8` (x2), `tests/create-task-action.test.ts::AC-001.8` | `lib/tasks/api.ts:100,110-114`, `app/_actions/create-task.ts:28-29`, `app/_components/task-form.tsx:12-17,95-97` | 503, 500, 502 non-JSON, network error and timeout each send exactly 1 request (no retry); message shown, values kept; 10 s POST timeout asserted. |

## Non-goals

The spec lists no non-goals. The template-owned layout is unchanged: `app/layout.tsx`, the header and the footer are not in the diff. `e2e/home.spec.ts` keeps its banner, main and contentinfo checks and changes only the h1 text. The template's "Check health" link test was dropped because the page no longer has that link (plan t5). ✔

## Deviations from the plan

- `app/page.tsx:11-18,43`: the page starts `listTasks()` itself and reads it with `use()` in `PendingTaskList` inside `<Suspense>`, where design.md uses `<TaskList />`. The streaming, the "Loading tasks…" fallback and the three states are the same. The test-render reason is in the code comment. **Acceptable.** As a result `TaskList` (`app/_components/task-list.tsx:45-47`) is used only by tests.
- Files outside every task's `files`: the acceptance tests and helpers (`tests/create-task-action.test.ts`, `tests/start-page.test.tsx`, `tests/task-form.test.tsx`, `tests/task-list.test.tsx`, `tests/tasks-api.test.ts`, `tests/tasks-validate.test.ts`, `tests/helpers/*`, `e2e/start-page.spec.ts`), which belong to the test phase. `contract/001-...json` was written by `/component:spec --from-plan`. `docs/backlog.md` was generated by `cplat spec index`. `.secrets.baseline.json` was regenerated by `devbox run secrets-baseline` for the contract's commit SHA, a false positive. **Acceptable.**
- `docs/backlog.md` shows status `approved` while `spec.md` says `building`. The generated index is stale. **Acceptable**, because the next `cplat spec index` refreshes it.
- `tests/start-page.test.tsx` changed after the red commit (`43cb63f`, render inside `await act(...)`). The user approved this, and the assertions are unchanged. **Acceptable.**
- Tasks t1 to t5 all have `done: true`. Every UX S1 element and state is present: h1, both sections, form slots, "Adding…" with `aria-disabled`, polite live region, the list, empty, error and loading states. ✔

## Contract

Matches design.md and the spec's contract. `GET`/`POST {base}/tasks` with a 10 s timeout and no retry. The body is `{title (trimmed), due_date | null}`. 201, 422 (`loc` last element or string), 409 and other answers are mapped as specified. `tests/contract/adapter.ts` is wired to `validateTask` and `TaskForm`. ✔

## Smoke

- `e2e/start-page.spec.ts::AC-001.2 ... @smoke` is the only read-only smoke check. It accepts a list, "No tasks yet" **or** the load error text. So in staging and prod it passes even when taskboard28-api is unreachable or `TASKBOARD28_API_URL` is missing. It shows that the page is served, not that tasks load. AC-001.2 itself is proven by `tests/start-page.test.tsx`.

## Mutation check (report only)

Skipped: no mutation check for shape web-nextjs yet.
