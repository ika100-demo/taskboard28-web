import { Suspense, use } from "react";

import { listTasks } from "@/lib/tasks/api";
import type { ListTasksResult } from "@/lib/tasks/api";

import { TaskForm } from "./_components/task-form";
import { TaskListView } from "./_components/task-list";

export const dynamic = "force-dynamic";

// The page starts the request once and the boundary reads it with `use`: an async child would not settle in a
// client render (tests), while a promise created by the page stays the same when only the boundary retries.
function PendingTaskList({ result }: { result: Promise<ListTasksResult> }) {
  return <TaskListView result={use(result)} />;
}

export default function HomePage() {
  const result = listTasks();
  return (
    <main id="main-content">
      <section className="section">
        <h1 className="hero-title">Tasks</h1>
      </section>

      <section aria-labelledby="new-task-title">
        <h2 id="new-task-title" className="section-title">
          New task
        </h2>
        <TaskForm />
      </section>

      <section aria-labelledby="all-tasks-title">
        <h2 id="all-tasks-title" className="section-title">
          All tasks
        </h2>
        <Suspense
          fallback={
            <div aria-live="polite">
              <p>Loading tasks…</p>
            </div>
          }
        >
          <PendingTaskList result={result} />
        </Suspense>
      </section>
    </main>
  );
}
