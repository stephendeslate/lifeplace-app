import { http, HttpResponse, delay } from "msw";
import { mockTasks, mockTaskCounts, createMockTask } from "../data/tasks.mock";
import type { Task, TaskCounts } from "../../../types/tasks.types";

const BASE_URL = "http://localhost:8000/api";

// The tasks system in this app is a composite that aggregates from
// other domain APIs (quotes, contracts, payments, communications, support).
// These handlers mock direct task endpoints for any future dedicated task API
// or for components that fetch tasks directly.

let tasksStore: Task[] = [...mockTasks];
let countsStore: TaskCounts = { ...mockTaskCounts };

export const resetTasksStore = () => {
  tasksStore = [...mockTasks];
  countsStore = { ...mockTaskCounts };
};

export const tasksHandlers = [
  // GET /api/tasks/ - List tasks (with optional domain filter)
  http.get(`${BASE_URL}/tasks/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const domain = url.searchParams.get("domain");
    const priority = url.searchParams.get("priority");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.toLowerCase();
    const _assignee = url.searchParams.get("assignee");

    let filtered = [...tasksStore];

    if (domain) {
      filtered = filtered.filter((t) => t.domain === domain);
    }
    if (priority) {
      filtered = filtered.filter((t) => t.priority === priority);
    }
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          (t.clientName && t.clientName.toLowerCase().includes(search)),
      );
    }

    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("page_size") || 25);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filtered.slice(start, end);

    return HttpResponse.json({
      count: filtered.length,
      results: paginated,
      next: end < filtered.length ? `page=${page + 1}` : null,
      previous: page > 1 ? `page=${page - 1}` : null,
      page_count: Math.ceil(filtered.length / pageSize),
      current_page: page,
      page_size: pageSize,
    });
  }),

  // GET /api/tasks/counts/ - Get task counts by domain
  http.get(`${BASE_URL}/tasks/counts/`, async () => {
    await delay(30);
    return HttpResponse.json(countsStore);
  }),

  // GET /api/tasks/:id/ - Get single task
  http.get(`${BASE_URL}/tasks/:id/`, async ({ params }) => {
    await delay(30);
    const id = params.id as string;
    const task = tasksStore.find((t) => t.id === id);
    if (!task) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(task);
  }),

  // POST /api/tasks/ - Create task
  http.post(`${BASE_URL}/tasks/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newTask = createMockTask({
      id: `task-${tasksStore.length + 100}`,
      domain: body.domain as Task["domain"],
      type: (body.type as string) || "pending_action",
      title: body.title as string,
      description: (body.description as string) || "",
      priority: (body.priority as Task["priority"]) || "medium",
      entityId: body.entityId as number,
      eventId: body.eventId as number,
      eventName: body.eventName as string,
      clientName: body.clientName as string,
      status: (body.status as string) || "pending",
    });
    tasksStore.push(newTask);

    // Update counts
    const domain = newTask.domain as keyof Omit<TaskCounts, "total">;
    if (domain in countsStore) {
      countsStore[domain] += 1;
      countsStore.total += 1;
    }

    return HttpResponse.json(newTask, { status: 201 });
  }),

  // PATCH /api/tasks/:id/ - Update task
  http.patch(`${BASE_URL}/tasks/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = params.id as string;
    const body = (await request.json()) as Record<string, unknown>;
    const idx = tasksStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    tasksStore[idx] = {
      ...tasksStore[idx],
      ...body,
    } as Task;
    return HttpResponse.json(tasksStore[idx]);
  }),

  // DELETE /api/tasks/:id/ - Delete/dismiss task
  http.delete(`${BASE_URL}/tasks/:id/`, async ({ params }) => {
    await delay(50);
    const id = params.id as string;
    const idx = tasksStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }

    // Update counts
    const domain = tasksStore[idx].domain as keyof Omit<TaskCounts, "total">;
    if (domain in countsStore) {
      countsStore[domain] = Math.max(0, countsStore[domain] - 1);
      countsStore.total = Math.max(0, countsStore.total - 1);
    }

    tasksStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
