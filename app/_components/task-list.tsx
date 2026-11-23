import { listTasks } from "@/lib/tasks/api";
import type { ListTasksResult } from "@/lib/tasks/api";

export const MSG_EMPTY = "No tasks yet";
export const MSG_LOAD_FAILED = "Tasks could not be loaded. Try again later.";

export type TaskListViewProps = { result: ListTasksResult };

export function TaskListView({ result }: TaskListViewProps) {
  if (!result.ok) {
    return (
      <div aria-live="polite">
        <p>{MSG_LOAD_FAILED}</p>
      </div>
    );
  }
  if (result.tasks.length === 0) {
    return (
      <div aria-live="polite">
        <p className="section-sub">{MSG_EMPTY}</p>
      </div>
    );
  }
  return (
    <div aria-live="polite">
      <ol className="task-list">
        {result.tasks.map((task) => (
          <li className="card" key={task.id}>
            <p className="card-title">{task.title}</p>
            <p className="card-text">
              <span className="visually-hidden">Due date: </span>
              {task.due_date ? (
                <time dateTime={task.due_date}>{task.due_date}</time>
              ) : (
                "No due date"
              )}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export async function TaskList() {
  return <TaskListView result={await listTasks()} />;
}
