---
spec_id: 001-start-page-that-lists-tasks-and-creates
shape: web-nextjs
spec_hash: 5c7c54582373
summary: Start page that lists tasks from taskboard28-api and creates them through a Server Action
tasks:
  - id: t1
    title: Add task types and the title validation with the site's messages
    files: [lib/tasks/types.ts, lib/tasks/validate.ts]
    covers: [AC-001.4]
    parallel_safe: true
    depends_on: []
  - id: t2
    title: Add the server-side taskboard28-api client with timeout and outcome mapping
    files: [lib/tasks/api.ts, docs/env-vars.md]
    covers: [AC-001.1, AC-001.3, AC-001.5, AC-001.6, AC-001.7, AC-001.8]
    parallel_safe: true
    depends_on: [t1]
  - id: t3
    title: Add the task list Server Component (list, empty, error)
    files: [app/_components/task-list.tsx]
    covers: [AC-001.1, AC-001.2, AC-001.7]
    parallel_safe: true
    depends_on: [t2]
  - id: t4
    title: Add the create Server Action, the client form, its styles and the contract adapter
    files: [app/_actions/create-task.ts, app/_components/task-form.tsx, app/globals.css, tests/contract/adapter.ts]
    covers: [AC-001.3, AC-001.4, AC-001.5, AC-001.6, AC-001.8]
    parallel_safe: true
    depends_on: [t1, t2]
  - id: t5
    title: Replace the template start page with the task page
    files: [app/page.tsx, app/_components/feature-card.tsx, app/_components/icons.tsx, tests/page.test.tsx, e2e/home.spec.ts]
    covers: [AC-001.1, AC-001.2, AC-001.3, AC-001.7]
    parallel_safe: true
    depends_on: [t3, t4]
---

# Plan — 001 Start page that lists tasks and creates them through taskboard28-api

Contract, types and DOM: [design.md](design.md). UX: [ux.md](ux.md).

## t1 — Add task types and the title validation with the site's messages

**Files:** lib/tasks/types.ts, lib/tasks/validate.ts
**Covers:** AC-001.4
**Goal:** one pure module that decides whether a title may be sent, used by the browser, the Server Action and the contract check, plus the shared types and message constants.

**Implementation notes:**
- `Task`, `NewTask`, `FieldErrors` exactly as in design.md.
- `validateTask(body)`: non-string or empty after `trim()` → `MSG_TITLE_REQUIRED`; `trim().length > TITLE_MAX` → `MSG_TITLE_TOO_LONG`; else `{}`. A missing `title` key is "required".
- `toNewTask(title, dueDate)`: trimmed title; `""` → `null`, else the date string as is.
- Export `MSG_LIMIT` and `MSG_SAVE_FAILED` here too (a `"use server"` file may not export constants).
- No imports from `next` or React: it runs in the browser, on the server and in Node tests.

**Done when:** the acceptance tests for AC-001.4 that exercise `validateTask` pass, and the contract cases `title-required`, `title-min`, `title-max` (`present`, `missing`, `at-limit`, `past-limit`) pass once t4 wires the adapter.

## t2 — Add the server-side taskboard28-api client with timeout and outcome mapping

**Files:** lib/tasks/api.ts, docs/env-vars.md
**Covers:** AC-001.1, AC-001.3, AC-001.5, AC-001.6, AC-001.7, AC-001.8
**Goal:** every call to taskboard28-api goes through `listTasks()` and `createTask()`, which never throw and turn each answer into the typed outcome of design.md's table.

**Implementation notes:**
- Base URL from `process.env.TASKBOARD28_API_URL`, read per call (not at import), trailing `/` stripped; unset → failure with `reason: "config"`.
- `fetch(url, { cache: "no-store", signal: AbortSignal.timeout(API_TIMEOUT_MS) })`; no retry. A `TimeoutError` → `reason: "timeout"`, any other thrown error → `reason: "network"`.
- `listTasks`: only `200` with a JSON array of valid task objects is `ok: true`; keep the order received.
- `createTask`: `POST` with `content-type: application/json` and `JSON.stringify({ title, due_date })` (`due_date` always present, `null` when empty). Map `201`, `422`, `409`, other exactly as the table; the `loc` rule (last array element, or the string itself).
- Log each failure with `logger.warn` from `@/lib/logger` (endpoint, status, reason); never the title.
- `docs/env-vars.md`: a "taskboard28-api" section with `TASKBOARD28_API_URL` (no default; set by the gitops entry, dev `http://taskboard28-api`; unset shows the error texts).

**Done when:** the acceptance tests for the client's outcomes (200 list and order, non-array and non-200, timeout after 10 s, network error, 201 request body, 422 `loc` handling, 409, 503 and other statuses) pass.

## t3 — Add the task list Server Component (list, empty, error)

**Files:** app/_components/task-list.tsx
**Covers:** AC-001.1, AC-001.2, AC-001.7
**Goal:** the "All tasks" content: an ordered list in creation order, "No tasks yet", or "Tasks could not be loaded. Try again later.".

**Implementation notes:**
- `TaskListView({ result })` is pure and synchronous; `TaskList()` is `async` and returns `<TaskListView result={await listTasks()} />`.
- DOM exactly as design.md: `<ol className="task-list">`, `<li className="card">`, title as `<p className="card-title">`, date as `<time dateTime>` with a `.visually-hidden` "Due date: " prefix, or the text "No due date".
- The status container is `<div aria-live="polite">` in all three states.
- Export `MSG_EMPTY` and `MSG_LOAD_FAILED`.
- No `.grid`; `.task-list` and `.visually-hidden` are styled by t4 in `app/globals.css`.

**Done when:** the acceptance tests for AC-001.1, AC-001.2 and AC-001.7 that render `TaskList` / `TaskListView` pass.

## t4 — Add the create Server Action, the client form, its styles and the contract adapter

**Files:** app/_actions/create-task.ts, app/_components/task-form.tsx, app/globals.css, tests/contract/adapter.ts
**Covers:** AC-001.3, AC-001.4, AC-001.5, AC-001.6, AC-001.8
**Goal:** a person can add a task without leaving the page, sees the site's or the API's message on every failure, and keeps the entered values.

**Implementation notes:**
- `createTaskAction(input)` as design.md's pseudocode: re-validate, `createTask`, `revalidatePath("/")` only on `created`.
- `TaskForm`: `onSubmit` with `preventDefault`, `validateTask` first (no action call when invalid), then `startTransition` + `createTaskAction`; never `<form action>`, so values survive failures; `form.reset()` only on `created`.
- Pending: "Adding…", `aria-disabled="true"`, repeat submits ignored.
- Message slots, ids, `aria-invalid`/`aria-describedby`, the polite "Task added." region and the focus rules exactly as design.md and ux.md (Accessibility).
- `app/globals.css`: `.field`, `.field-label`, text input and date input styling (light and dark tokens), `.field-error` and `.form-error` with a warning icon as `::before` (`content` with alt text `""`), `.visually-hidden`, `.task-list` (single column, no list bullets, gap `--s-3`); keep the existing focus ring.
- `tests/contract/adapter.ts`: `base` → `{ title: "Buy milk", due_date: null }`; `validate` → `validateTask(body)`; `showResponse` → `vi.mock("next/cache")`-safe render of `<TaskForm />` with `TASKBOARD28_API_URL` set and `fetch` stubbed to answer `{status, body}`, type a valid title, submit, wait for the button to read "Add task" again, return `{ fields: { title?, due_date? } from the field slots' text, form: the form slot's text }` (empty slots omitted).

**Done when:** the acceptance tests for AC-001.3 to AC-001.6 and AC-001.8 that render `TaskForm` or call `createTaskAction` pass, and `tests/contract.test.ts` passes in `devbox run test`.

## t5 — Replace the template start page with the task page

**Files:** app/page.tsx, app/_components/feature-card.tsx, app/_components/icons.tsx, tests/page.test.tsx, e2e/home.spec.ts
**Covers:** AC-001.1, AC-001.2, AC-001.3, AC-001.7
**Goal:** `/` is the task page of ux.md S1: heading, "New task" form and the streamed "All tasks" section.

**Implementation notes:**
- `app/page.tsx` as design.md's Page section; `export const dynamic = "force-dynamic"`; `<Suspense>` fallback "Loading tasks…".
- Delete `app/_components/feature-card.tsx` and `app/_components/icons.tsx` (no longer used; they would count as uncovered `app/**` code).
- Rewrite `tests/page.test.tsx` (template assertions) for the new page: main landmark id, single h1 "Tasks", h2s "New task" then "All tasks", the form present (mock `TaskList` and the action module).
- Update `e2e/home.spec.ts`: h1 "Tasks" instead of "taskboard28-web", drop the "Check health" link test (the header's "Health" link and `/api/health` stay checked), keep the 404 and phone-width tests. Locally no API runs, so the page shows the load error text and the form.

**Done when:** the acceptance tests for AC-001.1, AC-001.2, AC-001.3 and AC-001.7 that render the page or drive it in Playwright pass, and `devbox run ci` is green.
