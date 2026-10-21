# Jira Clone

A simple, fully functional Jira-like project management application.

- **Frontend:** React + TypeScript + Vite (plain CSS, Jira-style layout)
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite via Prisma ORM
- **Auth:** email/password registration + login, bcrypt-hashed passwords, JWT tokens

## Features

- **Authentication** – register, login, logout, protected dashboard. Roles: `admin`, `manager`, `employee`.
- **Dashboard** – total projects, total tasks, tasks assigned to you, tasks by status, recent tasks.
- **Projects** – create / view / edit / delete projects, each with its own Kanban board.
- **Kanban board** – To Do / In Progress / Done columns. Create, edit, delete and drag tasks between columns.
- **Task details** – modal with title, description, status, priority, assignee, labels, due date, created/updated dates.
- **Task comments** – anyone can comment on any task; comments appear chronologically inside the task modal.
- **Task assignment** – anyone can assign any task to any user (reassign or unassign), in the task modal.
- **Notifications** – generated when a task is assigned, changes status, or is updated; mark them as read.
- **My Tasks** – all tasks assigned to you with project, status, priority and due date.
- **Search & filtering** – filter by title, status, priority and assigned employee.

## Project structure

```
jira/
├── client/          # React + Vite frontend (port 5173, falls back to next free port)
├── server/          # Express REST API (port 3001)
├── prisma/
│   ├── schema.prisma    # User, Project, Task, TaskComment, Notification models
│   ├── migrations/      # SQL migration(s)
│   ├── seed.ts          # demo data
│   └── dev.db           # SQLite database (created by migrate)
└── package.json     # Prisma tooling + scripts
```

- The Prisma schema and database live at the project root and are **shared** by the server and the seed script. `@prisma/client` (and Prisma itself) are installed at the root; the server resolves them from there (`server/package.json` has no duplicate copy).
- The Vite dev server proxies `/api/*` requests to `http://localhost:3001`, so the frontend uses same-origin requests and there is no CORS friction.

## Demo accounts

All demo accounts use the password **`demo123`**:

| Role     | Email                |
| -------- | -------------------- |
| Admin    | `admin@demo.com`     |
| Manager  | `manager@demo.com`   |
| Employee | `employee@demo.com`  |
| Employee | `employee2@demo.com` |

## Setup and run

Requirements: **Node.js 20+** and **npm**.

```bash
# 1. Install dependencies (root for Prisma, plus server and client)
npm run install:all

# 2. Create the SQLite database and apply the migration
npm run db:migrate

# 3. Seed the database with demo users, projects and tasks
npm run db:seed

# 4. Start the backend (http://localhost:3001)
npm run dev:server

# 5. In a second terminal, start the frontend (http://localhost:5173)
npm run dev:client
```

Then open **http://localhost:5173** and sign in with one of the demo accounts above.

> If port 5173 is already in use, Vite automatically picks the next free port (5174, 5175, …) and prints it in the console.

### Quick start (all at once)

In two terminals:

```bash
npm run dev:server   # terminal 1
npm run dev:client   # terminal 2
```

(Requires the database to be set up once with `npm run db:migrate` + `npm run db:seed`.)

## Common commands

```bash
npm run install:all   # install root, server and client dependencies
npm run db:migrate    # apply the Prisma migration (creates prisma/dev.db)
npm run db:seed       # (re)seed demo data (wipes and recreates it)
npm run db:reset      # drop, migrate and seed from scratch
npm run db:studio     # open Prisma Studio to inspect the database
npm run dev:server    # run the Express API with hot reload
npm run dev:client    # run the Vite dev server with hot reload
```

### Running manually (instead of the shortcut scripts)

```bash
cd server && npm run dev      # API on http://localhost:3001
cd client && npm run dev      # frontend on http://localhost:5173
npx prisma migrate dev --name init   # from the project root
npx prisma db seed                    # from the project root
```

### Type checking / build

```bash
npm run typecheck --prefix server
npm run build --prefix client
```

## API overview

All endpoints are JSON. Authenticated endpoints expect `Authorization: Bearer <token>`.

| Method | Endpoint                        | Description                          |
| ------ | ------------------------------- | ------------------------------------ |
| POST   | `/api/auth/register`            | Create an account (returns a token)  |
| POST   | `/api/auth/login`               | Sign in (returns a token)            |
| POST   | `/api/auth/logout`              | Discard the client token             |
| GET    | `/api/auth/me`                  | Current user                         |
| GET    | `/api/projects`                 | List projects (with task counts)     |
| POST   | `/api/projects`                 | Create a project (any user)          |
| GET    | `/api/projects/:id`             | Project details                      |
| PUT    | `/api/projects/:id`             | Update a project (admin/manager, or creator) |
| DELETE | `/api/projects/:id`             | Delete a project (admin/manager, or creator) |
| GET    | `/api/tasks`                    | List tasks (see filters below)       |
| POST   | `/api/tasks`                    | Create a task                        |
| GET    | `/api/tasks/:id`                | Task details                         |
| PUT    | `/api/tasks/:id`                | Update a task                        |
| DELETE | `/api/tasks/:id`                | Delete a task (admin/manager)        |
| GET    | `/api/tasks/:id/comments`       | List a task's comments               |
| POST   | `/api/tasks/:id/comments`       | Add a comment to a task (any user)   |
| GET    | `/api/notifications`            | Current user's notifications         |
| PUT    | `/api/notifications/:id/read`   | Mark a notification as read          |
| GET    | `/api/users`                    | User directory (for task assignment) |

**Task list filters:** `GET /api/tasks?search=&status=todo|in_progress|done&priority=low|medium|high&assignee=<userId|me>&projectId=<id>`

## Permissions (simple)

- **Admin / Manager** — create, edit and delete any project; create, edit, delete and reassign tasks; assign tasks to employees.
- **Employee** — create projects (and edit/delete the ones they created), view everything, create tasks, and edit tasks assigned to them or created by them (status, priority, description, etc.). Moving tasks between projects is a manager/admin action.
- **Assignment (anyone)** — any logged-in user can set or change the assignee of any task, and can create tasks assigned to anyone. Assignee-only changes are allowed even on tasks the user is not otherwise involved with.
- **Comments** — any authenticated user can comment on any task.
- Registration accepts an optional `role` (defaults to `employee`) — a demo simplification so you can test every role immediately.