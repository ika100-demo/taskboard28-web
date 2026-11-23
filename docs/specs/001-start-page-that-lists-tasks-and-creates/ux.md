---
spec_id: 001-start-page-that-lists-tasks-and-creates
spec_hash: 5c7c54582373
---

# UX — 001 Start page that lists tasks and creates them through taskboard28-api

The spec has no stories, so the flows below follow the criteria, one per task a person does: see the tasks, add a task, and recover when something goes wrong. There is one screen, the start page `/`. It replaces the template's hero, feature cards and "Get started" content. The site header, the footer and the skip link from `app/layout.tsx` stay as they are.

## Flows

### F1 — See the tasks

1. A person opens `/`. The page loads with the heading "Tasks", the "New task" form and the "All tasks" section. (AC-001.1, AC-001.2)
2. While the server waits for `GET /tasks`, the "All tasks" section shows "Loading tasks…". The form can already be used. (AC-001.7)
3. The outcome depends on the answer:
   - **Tasks returned:** an ordered list in creation order, oldest first. Each item shows its title, then its due date as `2026-12-24` or the text "No due date". (AC-001.1)
   - **`[]` returned:** the text "No tasks yet" appears instead of the list. The form stays visible. (AC-001.2)
   - **API unreachable, no answer within 10 s, or an answer that is not `200` with a JSON array:** the text "Tasks could not be loaded. Try again later." appears instead of the list. The form stays visible. (AC-001.7)

### F2 — Add a task

1. The person moves to the "Title" field and types "Buy milk". (AC-001.3)
2. Optionally the person picks 2026-12-24 in the "Due date (optional)" date input, or leaves it empty. (AC-001.3)
3. The person activates "Add task" (or presses Enter in a field). (AC-001.3)
4. The site checks the trimmed title before it sends anything:
   - If the title is empty or whitespace-only, "Title is required" appears next to the title field. No request is sent, both values stay as entered, and focus moves to the title field. (AC-001.4)
   - If the title is longer than 200 characters after trimming, "Title must be at most 200 characters" appears in the same way. (AC-001.4)
5. If the title is valid, the button changes to "Adding…" and is disabled. Both fields keep their values. The site sends `POST /tasks` with `{"title": "<trimmed title>", "due_date": "2026-12-24" | null}`. (AC-001.3)
6. The outcome depends on the answer:
   - **`201`:** the person stays on the page. The new task appears last in the list with its title and its due date (or "No due date"). If the list showed "No tasks yet", that text is replaced by a one-item list. Both fields are cleared, any earlier message is removed, focus returns to the "Title" field, and screen readers hear "Task added." (AC-001.3)
   - **`422` with a `detail` item whose `loc` ends in `title`:** that item's `msg` appears next to the title field. Values are kept and focus moves to the title field. (AC-001.5)
   - **`409`:** "The task limit of 1000 is reached" appears in the form's message area. Values are kept and the list is unchanged. (AC-001.6)
   - **`503`, any other status, a network error, or a timeout after 10 s:** "The task could not be saved. Try again." appears in the form's message area. Values are kept and the list is unchanged. (AC-001.8)
7. After any failure the person can correct the values or simply submit again. The new attempt clears the old message. (AC-001.4, AC-001.5, AC-001.6, AC-001.8)

## Screens

### S1 — Start page

- **Route:** `/` (replaces the template content of `app/page.tsx`)
- **Purpose:** show all tasks in creation order and create a new task without leaving the page.
- **Criteria:** AC-001.1, AC-001.2, AC-001.3, AC-001.4, AC-001.5, AC-001.6, AC-001.7, AC-001.8

Elements, in reading and tab order inside `<main id="main-content">`:

1. `h1` "Tasks" with the `.hero-title` style, inside a compact `.section` (no hero, no eyebrow, no action buttons).
2. Section "New task" (`h2.section-title`), holding a `<form noValidate>`:
   1. A label "Title" and a text input `name="title"`. It has no `maxLength` and no `required` attribute, so the browser neither cuts off nor pre-empts the site's own messages (AC-001.4).
   2. A field message slot directly below the title input, empty until there is an error. It holds "Title is required", "Title must be at most 200 characters", or the API's `msg`. (AC-001.4, AC-001.5)
   3. A label "Due date (optional)" and an `<input type="date" name="due_date">`. Its value is sent as is, or `null` when empty. (AC-001.3)
   4. A form message slot above the button, empty until there is an error. It holds "The task limit of 1000 is reached" or "The task could not be saved. Try again." (AC-001.6, AC-001.8)
   5. A submit button "Add task" (`.btn .btn-primary`). It reads "Adding…" while the request is pending. (AC-001.3)
   6. A visually hidden polite live region that announces "Task added." after a `201`. (AC-001.3)
3. Section "All tasks" (`h2.section-title`) with exactly one of these:
   - An `<ol>` of tasks. Each `<li>` uses the existing `.card` look (border, radius, padding) but has no icon and no `h3`. Per item:
     - The title, in `.card-title` style, as a `<p>` rather than a heading.
     - The due date, in `.card-text` style, as `<time dateTime="2026-12-24">2026-12-24</time>`, or "No due date". A visually hidden "Due date: " in its own element comes before it, so screen readers get context while the visible text stays exactly the value. (AC-001.1, AC-001.3)
   - The text "No tasks yet" (`.section-sub` style). (AC-001.2)
   - The text "Tasks could not be loaded. Try again later." (AC-001.7)
   - The text "Loading tasks…" while `GET /tasks` is pending (see States).

The list is one column, a vertical stack, and is not laid out with `.grid`, so that "A followed by B" is also the visual order.

```
+--------------------------------------------------+
| [T] taskboard28-web         Health Ready Metrics |  <- SiteHeader (unchanged)
+--------------------------------------------------+
|  Tasks                                      (h1) |
|                                                  |
|  New task                                   (h2) |
|  Title                                           |
|  [______________________________________]        |
|  ! Title is required             (when invalid)  |
|  Due date (optional)                             |
|  [ yyyy-mm-dd  v ]                               |
|  ! The task could not be saved. Try again.       |
|  [ Add task ]                                    |
|                                                  |
|  All tasks                                  (h2) |
|  +--------------------------------------------+  |
|  | A                                          |  |
|  | 2026-12-24                                 |  |
|  +--------------------------------------------+  |
|  | B                                          |  |
|  | No due date                                |  |
|  +--------------------------------------------+  |
+--------------------------------------------------+
| SiteFooter (unchanged)                           |
+--------------------------------------------------+
```

**Reuses:**
- `RootLayout` with `SiteHeader`, `SiteFooter` and the skip link.
- The classes `.section`, `.section-head`, `.section-title`, `.section-sub`, `.hero-title`, `.btn`, `.btn-primary`, `.card`, `.card-title` and `.card-text` from `app/globals.css`.
- `app/error.tsx` stays the boundary for unexpected render errors. It is not used for API failures, which are handled inside the page (AC-001.7).

**New pieces** (names are the architect's choice):
- A task list view, server-rendered.
- A create form, a client component bound to a Server Action.
- Styles for the form: field, label, the error text colour and icon, and the visually hidden text.

## States

### S1 — Start page, "All tasks" section

| State | What the user reads |
|---|---|
| Loading (waiting for `GET /tasks`, up to 10 s) | "Loading tasks…". The heading and the form are already shown. |
| Empty (`200 []`) | "No tasks yet" (AC-001.2) |
| Error (unreachable, timeout, not `200`, or not a JSON array) | "Tasks could not be loaded. Try again later." (AC-001.7) |
| Success | The ordered list. Each item shows its title, then `YYYY-MM-DD` or "No due date". (AC-001.1) |
| After a `201` | The list refreshes, with the new task last. If the refreshed read fails, the error text above is shown. (AC-001.3) |

### S1 — Start page, "New task" form

| State | What the user reads |
|---|---|
| Idle | Empty "Title" and "Due date (optional)" fields and the button "Add task". |
| Submitting | The button reads "Adding…" and is disabled. Fields keep their values. |
| Success (`201`) | The fields are empty, messages are cleared, and "Task added." is announced to screen readers only. (AC-001.3) |
| Title empty or whitespace-only | "Title is required" next to the title field. Values are kept and no request is sent. (AC-001.4) |
| Title over 200 characters after trimming | "Title must be at most 200 characters" next to the title field. Values are kept and no request is sent. (AC-001.4) |
| API `422`, `loc` ends in `title` | The item's `msg`, verbatim, next to the title field. Values are kept. (AC-001.5) |
| API `409` | "The task limit of 1000 is reached" in the form message slot. Values are kept and the list is unchanged. (AC-001.6) |
| API `503`, another status, network error or timeout | "The task could not be saved. Try again." in the form message slot. Values are kept. (AC-001.8) |

Only one message is shown at a time. A new submit clears the previous one.

## Accessibility

- **Headings:**
  - One `h1` "Tasks".
  - `h2` "New task" and `h2` "All tasks".
  - Task titles are not headings, which keeps the outline short when there are up to 1000 tasks.
- **Landmarks:** the header `nav` "Primary" (unchanged), then `main#main-content`, then the footer. Each section uses `aria-labelledby` pointing to its `h2`.
- **Keyboard order:**
  1. Skip link
  2. Brand
  3. Nav links
  4. "Title"
  5. "Due date (optional)" (the native date control and its picker)
  6. "Add task"
  7. Footer links

  The task list items are not focusable, because they have no actions. Enter in either field submits the form.
- **Focus after each action:**
  - Client-side validation error or API `422`: focus moves to the "Title" input.
  - API `409` or a save failure: focus stays on "Add task". The message is announced through `role="alert"` on the form message slot.
  - Success: focus moves to the empty "Title" input, ready for the next task. The live region announces "Task added.".
  - While submitting, the disabled button does not lose focus to `body`. When it is re-enabled, focus is placed as described above.
- **Labels:**
  - Each input has a visible `<label for>` with "Title" or "Due date (optional)".
  - The button's accessible name is "Add task". While pending it is "Adding…", with `aria-disabled="true"`.
  - When the title has an error, the input gets `aria-invalid="true"` and `aria-describedby` pointing to the field message slot, which has `role="alert"`, so its text is read with the field.
- **Colour-independent messages:**
  - Every error is shown as text and prefixed with a warning icon that is `aria-hidden`, never by colour or the field border alone.
  - "No due date" is spelled out, never shown as a blank or a dash.
  - The visible focus ring from `globals.css` is kept in both light and dark themes.
- **Lists and dates:**
  - The tasks are an `<ol>`, so screen readers announce the count and position ("1 of 2").
  - Dates use `<time dateTime>` and are shown as `YYYY-MM-DD`, exactly as returned, with no locale formatting.
- **Status text:** "Loading tasks…", "No tasks yet" and "Tasks could not be loaded. Try again later." sit in a container with `aria-live="polite"`, so the streamed change from loading to a result is announced.
