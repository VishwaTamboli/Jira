import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { StatusBadge, PriorityBadge } from '../components/badges';
import { FilterBar, EMPTY_FILTERS, type TaskFilters } from '../components/FilterBar';
import { TaskModal } from '../components/TaskModal';
import { formatDate, formatRelative, isOverdue } from '../lib/format';
import type { Project, Task, User } from '../types';

export default function MyTasks() {
  const projectId = 0; // not used here
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openTask, setOpenTask] = useState<Task | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [taskList, userList, projectList] = await Promise.all([
          api<Task[]>('/tasks?assignee=me'),
          api<User[]>('/users'),
          api<Project[]>('/projects'),
        ]);
        if (cancelled) return;
        setTasks(taskList);
        setUsers(userList);
        setProjects(projectList);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q && !task.title.toLowerCase().includes(q)) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      return true;
    });
  }, [tasks, filters]);

  function handleSaved(saved: Task) {
    setTasks((prev) =>
      prev.some((t) => t.id === saved.id)
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [saved, ...prev],
    );
  }

  function handleDeleted(taskId: number) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Tasks</h2>
          <p className="sub">{tasks.length} task{tasks.length === 1 ? '' : 's'} assigned to you</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <FilterBar filters={filters} onChange={setFilters} users={users} showAssignee={false} />

      {filtered.length === 0 ? (
        <div className="empty-state mt-8">
          <h3>Nothing here</h3>
          <p className="muted">You have no matching tasks assigned to you.</p>
        </div>
      ) : (
        <div className="list-card mt-8">
          <div className="row-list">
            {filtered.map((task) => (
              <div key={task.id} className="row-item" onClick={() => setOpenTask(task)}>
                <div className="grow">
                  <div className="row-title">{task.title}</div>
                  <div className="row-sub">
                    {task.project?.name}
                    {task.dueDate
                      ? ` · due ${formatDate(task.dueDate)}${isOverdue(task.dueDate) && task.status !== 'done' ? ' (overdue)' : ''}`
                      : ''}
                  </div>
                </div>
                <div className="row-meta">
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                  <span className="muted" style={{ fontSize: 12 }}>
                    {formatRelative(task.updatedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {openTask && (
        <TaskModal
          task={openTask}
          projectId={projectId}
          users={users}
          projects={projects}
          onClose={() => setOpenTask(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}