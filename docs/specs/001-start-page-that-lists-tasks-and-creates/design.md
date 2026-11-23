# Design — 001 Start page that lists tasks and creates them through taskboard28-api

## Decisions

- The site calls taskboard28-api only on the server: the list in an async Server Component, the create in a Server Action. One module (`lib/tasks/api.ts`) owns every HTTP call, the 10-second timeout (`AbortSignal.timeout(10_000)`), `cache: "no-store"` and the mapping of each answer to a typed outcome, so no component sees a raw `Response`. No retry, as the contract requires (a retried `POST` could create a task twice).
- The page is `export const dynamic = "force-dynamic"`: without it `next build` would prerender `/` with no API and bake the error state into the image.
- The list streams: `app/page.tsx` renders the heading and the form at once and wraps `<TaskList />` in `<Suspense>` whose fallback is "Loading tasks…" (UX F1.2).
- After a `201` the Server Action calls `revalidatePath("/")`, so the response of the same round trip carries the refreshed list and the new task appears last without leaving the page (AC-001.3). No revalidation on any failure, so the list stays unchanged (AC-001.6, AC-001.8).
- The form's `onSubmit` calls `event.preventDefault()`, validates in the browser and only then calls the Server Action inside `startTransition`. It does not use `<form action={…}>`, because React 19 resets uncontrolled fields after a form action and the entered values must be kept on every failure (AC-001.4 to AC-001.8). On success the component calls `form.reset()`.
- The title rules live in one pure module (`lib/tasks/validate.ts`) that the browser, the Server Action (it re-validates, never trusting the client) and the contract adapter all call.
- `/api/ready` stays unchanged and does not check taskboard28-api: when the API is down the page must still be served and show its error texts (AC-001.7, AC-001.8); taking the website out of rotation would hide them.
- `TASKBOARD28_API_URL` has no default. Unset is treated like an unreachable API (the error texts) and logged as `warn` with `reason: "config"`, so a missing gitops value is visible in the logs rather than silently pointing at localhost.
- A `422` item whose field is `due_date` is shown under the date input, in a field message slot like the title's. The UX lists only the title slot; the contract says the website shows an item's `msg` next to "that field", and the date is the only other field the form sends.
- Error icons are a CSS `::before` on the message slots (not DOM nodes), so each slot's `textContent` is exactly the message the criteria name, and screen readers do not read the icon.
- No ADR: the server-side-only pattern and the env var are fixed by the system plan; everything else is local to this feature.

## Modules

| Module | Responsibility | New / changed |
|---|---|---|
| `lib/tasks/types.ts` | `Task`, `NewTask`, `FieldErrors` types | new |
| `lib/tasks/validate.ts` | title rules and the site's own messages | new |
| `lib/tasks/api.ts` | server-only client for `GET /tasks` and `POST /tasks`: timeout, outcome mapping, logging | new |
| `app/_components/task-list.tsx` | `TaskList` (async, fetches) and `TaskListView` (pure: list / empty / error) | new |
| `app/_actions/create-task.ts` | `"use server"` action `createTaskAction` | new |
| `app/_components/task-form.tsx` | `"use client"` create form: validation, pending state, messages, focus, live region | new |
| `app/page.tsx` | start page: h1, "New task" section, "All tasks" section with Suspense | changed |
| `app/globals.css` | form field, label, error message and icon, `.visually-hidden`, single-column `.task-list` | changed |
| `app/_components/feature-card.tsx`, `app/_components/icons.tsx` | template content no longer used | deleted (left in place, their 0 % coverage pulls `app/**` below the 80 % gate) |
| `tests/contract/adapter.ts` | wires the contract check to `validateTask` and `TaskForm` | changed |
| `docs/env-vars.md` | documents `TASKBOARD28_API_URL` | changed |

## Contract

### Consumed: taskboard28-api

As in the spec's Contract section (binding): `GET /tasks` → `200` array of `{id, title, due_date, created_at}` | `503`; `POST /tasks` `{title, due_date}` → `201` task | `422` FastAPI detail | `409` | `503`. Base URL `process.env.TASKBOARD28_API_URL`, path joined as `${base without trailing "/"}/tasks`; `POST` sends `content-type: application/json` and the body `{"title": <trimmed>, "due_date": "<YYYY-MM-DD>" | null}`.

### Types (`lib/tasks/types.ts`)

```ts
export interface Task { id: string; title: string; due_date: string | null; created_at: string }
export interface NewTask { title: string; due_date: string | null } // title already trimmed
export type FieldErrors = Partial<Record<"title" | "due_date", string>>; // {} = valid
```

### Validation (`lib/tasks/validate.ts`)

```ts
export const TITLE_MAX = 200;
export const MSG_TITLE_REQUIRED = "Title is required";
export const MSG_TITLE_TOO_LONG = "Title must be at most 200 characters";

/** The site's own check, before anything is sent (AC-001.4). Accepts any body shape (the contract check removes fields). */
export function validateTask(body: { title?: unknown; due_date?: unknown }): FieldErrors;
/** Trimmed title, and the date input's value with "" -> null. */
export function toNewTask(title: string, dueDate: string): NewTask;
```

`validateTask`: title not a string, or empty after `trim()` → `{ title: MSG_TITLE_REQUIRED }`; `trim().length > 200` → `{ title: MSG_TITLE_TOO_LONG }`; else `{}`. The site does not check the due date (the contract sends the date input's value as is); only the API rejects it.

### API client (`lib/tasks/api.ts`)

```ts
export type ListTasksResult = { ok: true; tasks: Task[] } | { ok: false };
export type CreateTaskResult =
  | { kind: "created" }                           // 201
  | { kind: "invalid"; fieldErrors: FieldErrors } // 422 with at least one usable item
  | { kind: "limit" }                             // 409
  | { kind: "failed" };                           // everything else
export const API_TIMEOUT_MS = 10_000;
export function listTasks(): Promise<ListTasksResult>;
export function createTask(task: NewTask): Promise<CreateTaskResult>;
```

| Answer | `listTasks` | `createTask` |
|---|---|---|
| `200` + JSON array whose every element has string `id`, `title`, `created_at` and string-or-null `due_date` | `{ok: true, tasks}` in the order received | — |
| `201` (any body) | — | `created` |
| `422` + `{"detail": [ … ]}` | `{ok: false}` | per item: field = last element of `loc` if `loc` is an array, `loc` itself if a string; the first item for `title` and the first for `due_date` become `fieldErrors[field] = msg` (string). No usable item (no `detail` array, no item for `title`/`due_date`, non-string `msg`) → `failed` |
| `409` | `{ok: false}` | `limit` |
| any other status, body not JSON, an element that is not a task, network error, timeout, `TASKBOARD28_API_URL` unset | `{ok: false}` | `failed` |

Every `ok: false` / `failed` logs `logger.warn("taskboard28-api call failed", { endpoint: "GET /tasks" | "POST /tasks", status?: number, reason: "status" | "body" | "network" | "timeout" | "config" })`. Titles are never logged.

### Server Action (`app/_actions/create-task.ts`)

```ts
"use server";
export type CreateTaskState =
  | { status: "created" }
  | { status: "error"; fieldErrors: FieldErrors; formError?: string };
export async function createTaskAction(input: { title: string; due_date: string }): Promise<CreateTaskState>;
```

The messages `MSG_LIMIT = "The task limit of 1000 is reached"` and `MSG_SAVE_FAILED = "The task could not be saved. Try again."` are exported from `lib/tasks/validate.ts` next to the title messages (a `"use server"` file may export only async functions).

Pseudocode: `errors = validateTask(input)`; non-empty → `{status: "error", fieldErrors: errors}` with no API call. Else `createTask(toNewTask(input.title, input.due_date))`: `created` → `revalidatePath("/")`, `{status: "created"}`; `invalid` → `{status: "error", fieldErrors}`; `limit` → `{status: "error", fieldErrors: {}, formError: MSG_LIMIT}`; `failed` → `{status: "error", fieldErrors: {}, formError: MSG_SAVE_FAILED}`. Unit tests mock `next/cache`.

### Task list (`app/_components/task-list.tsx`)

```ts
export const MSG_EMPTY = "No tasks yet";
export const MSG_LOAD_FAILED = "Tasks could not be loaded. Try again later.";
export function TaskListView(props: { result: ListTasksResult }): JSX.Element;
export async function TaskList(): Promise<JSX.Element>; // <TaskListView result={await listTasks()} />
```

`TaskListView` renders, inside a `<div aria-live="polite">`, exactly one of:

- `<ol className="task-list">` with one `<li className="card">` per task: `<p className="card-title">{title}</p>`, then `<p className="card-text"><span className="visually-hidden">Due date: </span>` followed by `<time dateTime={d}>{d}</time>` or the text `No due date`, `</p>`;
- `<p className="section-sub">No tasks yet</p>` for `[]`;
- `<p>Tasks could not be loaded. Try again later.</p>` for `ok: false`.

Tests render it with `render(await TaskList())` (with `fetch` stubbed) or `render(<TaskListView result={…} />)`.

### Page (`app/page.tsx`)

`export const dynamic = "force-dynamic"`; `<main id="main-content">` with `<section className="section">` holding `<h1 className="hero-title">Tasks</h1>`, then `<section aria-labelledby="new-task-title">` (`<h2 id="new-task-title" className="section-title">New task</h2>` + `<TaskForm />`), then `<section aria-labelledby="all-tasks-title">` (`<h2 id="all-tasks-title" className="section-title">All tasks</h2>` + `<Suspense fallback={<div aria-live="polite"><p>Loading tasks…</p></div>}><TaskList /></Suspense>`).

### Form (`app/_components/task-form.tsx`)

`export function TaskForm(): JSX.Element` (`"use client"`), the DOM of UX S1 element 2:

- `<form noValidate>`; `<label htmlFor="task-title">Title</label>` + `<input id="task-title" name="title" type="text">` (no `required`, no `maxLength`); field slot `<p id="task-title-error" role="alert">`, empty when there is no error. While it has text the input carries `aria-invalid="true"` and `aria-describedby="task-title-error"`.
- `<label htmlFor="task-due-date">Due date (optional)</label>` + `<input id="task-due-date" name="due_date" type="date">`; field slot `<p id="task-due-date-error" role="alert">`, same wiring.
- Form slot `<p id="task-form-error" role="alert">` above the button.
- `<button type="submit" className="btn btn-primary">`: "Add task"; while pending "Adding…" with `aria-disabled="true"` and a submit that does nothing (not the `disabled` attribute, so focus is not lost to `body`).
- `<p className="visually-hidden" aria-live="polite">`: "Task added." after a `201`, empty otherwise.
- Submit: clear all messages; `errors = validateTask(values)`; if any → show, focus the title input, stop (no Server Action, so no `POST /tasks`). Else `startTransition(async () => { state = await createTaskAction(values) })`. `created` → `form.reset()`, announce, focus the title input. `fieldErrors` → show, focus the title input (the due date input when only it has an error). `formError` → show, focus stays on the button. One message at a time: title error before due date error before form error.

## Data

None in this repo; tasks live in taskboard28-api.
