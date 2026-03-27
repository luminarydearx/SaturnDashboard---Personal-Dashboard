import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, readJson, writeJson } from '@/lib/db';
import { autoSyncToGithub } from '@/lib/github-auto';
import { logActivity } from '@/lib/activityLogger';

export interface Task {
  id:          string;
  title:       string;
  description: string;
  assignedTo:  string;   // userId
  assignedBy:  string;   // userId
  status:      'todo' | 'progress' | 'done';
  priority:    'low' | 'medium' | 'high';
  deadline:    string;   // ISO
  createdAt:   string;
  updatedAt:   string;
  tags:        string[];
}

function getTasks(): Task[] { return readJson<Task[]>('tasks.json', []); }
function saveTasks(tasks: Task[]): void { writeJson('tasks.json', tasks); }

const MANAGER_ROLES = ['owner', 'co-owner', 'admin'];
const DEV_ROLES     = ['owner', 'co-owner', 'admin', 'developer'];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !DEV_ROLES.includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const all = getTasks();
  // Devs only see their own tasks; managers see all
  const tasks = MANAGER_ROLES.includes(user.role)
    ? all
    : all.filter(t => t.assignedTo === user.id);

  return NextResponse.json({ success: true, tasks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !MANAGER_ROLES.includes(user.role))
    return NextResponse.json({ error: 'Only admin/co-owner/owner can assign tasks' }, { status: 403 });

  const body = await req.json() as Partial<Task>;
  if (!body.title?.trim() || !body.assignedTo)
    return NextResponse.json({ error: 'Title and assignedTo required' }, { status: 400 });

  const now = new Date().toISOString();
  const task: Task = {
    id:          Math.random().toString(36).slice(2, 10),
    title:       body.title.trim(),
    description: body.description?.trim() || '',
    assignedTo:  body.assignedTo,
    assignedBy:  user.id,
    status:      'todo',
    priority:    body.priority || 'medium',
    deadline:    body.deadline || '',
    tags:        body.tags || [],
    createdAt:   now,
    updatedAt:   now,
  };

  const tasks = getTasks();
  tasks.unshift(task);
  saveTasks(tasks);
  autoSyncToGithub(`Task created: ${task.title}`).catch(() => {});
  logActivity({ category: 'system', action: 'TASK_CREATE', actor: user.username, actorRole: user.role, detail: task.title, success: true });

  return NextResponse.json({ success: true, task });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { id: string; status?: Task['status']; priority?: Task['priority']; deadline?: string; title?: string; description?: string };
  const tasks = getTasks();
  const idx   = tasks.findIndex(t => t.id === body.id);
  if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const task = tasks[idx];
  // Dev can only update status of their own tasks
  if (!MANAGER_ROLES.includes(user.role) && task.assignedTo !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (body.status)      task.status      = body.status;
  if (body.priority && MANAGER_ROLES.includes(user.role)) task.priority = body.priority;
  if (body.deadline && MANAGER_ROLES.includes(user.role)) task.deadline = body.deadline;
  if (body.title    && MANAGER_ROLES.includes(user.role)) task.title    = body.title;
  if (body.description !== undefined && MANAGER_ROLES.includes(user.role)) task.description = body.description;
  task.updatedAt = new Date().toISOString();

  tasks[idx] = task;
  saveTasks(tasks);
  autoSyncToGithub(`Task updated: ${task.title}`).catch(() => {});

  return NextResponse.json({ success: true, task });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !MANAGER_ROLES.includes(user.role))
    return NextResponse.json({ error: 'Only managers can delete tasks' }, { status: 403 });

  const { id } = await req.json() as { id: string };
  saveTasks(getTasks().filter(t => t.id !== id));
  autoSyncToGithub('Task deleted').catch(() => {});

  return NextResponse.json({ success: true });
}
