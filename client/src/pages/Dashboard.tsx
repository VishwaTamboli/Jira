import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { StatusBadge, PriorityBadge } from '../components/badges';
import { useAuth } from '../context/AuthContext';
import { formatRelative } from '../lib/format';
import { STATUSES, STATUS_LABELS, type Project, type Task } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectList, taskList, myTaskList] = await Promise.all([
          api<Project[]>('/projects'),
          api<Task[]>('/tasks'),
          api<Task[]>('/tasks?assignee=me'),
        ]);
        if (cancelled) return;
        setProjects(projectList);
        setTasks(taskList);
        setMyTasks(myTaskList);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusBreakdown = useMemo(
    () => STATUSES.map((s) => ({ status: s, count: tasks.filter((t) => t.status === s).length })),
    [tasks],
  );
  const totalDone = statusBreakdown.find((s) => s.status === 'done')?.count ?? 0;
  const donePercent = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      {error && <div className="error-banner">{error}</div>}

      <div className="page-header">
        <div>
          <h2>Welcome back, {user?.name?.split(' ')[0] ?? ''} 👋</h2>
          <p className="sub">Here is what is happening across your projects.</p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total projects</div>
          <div className="stat-value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total tasks</div>
          <div className="stat-value">{tasks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Assigned to you</div>
          <div className="stat-value">{myTasks.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completion</div>
          <div className="stat-value">{donePercent}%</div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel">
          <div className="panel-header">
            <h3>Tasks by status</h3>
          </div>
          <div className="status-breakdown">
            {statusBreakdown.map(({ status, count }) => (
              <div className="status-row" key={status}>
                <div className="status-row-label">
                  <span>{STATUS_LABELS[status]}</span>
                  <span>{count}</span>
                </div>
                <div className="status-bar">
                  <div
                    className={`status-bar-fill status-bar-fill--${status}`}
                    style={{
                      width: tasks.length ? `${(count / tasks.length) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3>Recent tasks</h3>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks yet</h3>
              <p>Add a project and some tasks to get started.</p>
            </div>
          ) : (
            <div className="task-list">
              {tasks.slice(0, 7).map((task) => (
                <div
                  key={task.id}
                  className="task-list-item"
                  onClick={() => navigate(`/projects/${task.projectId}`)}
                >
                  <div className="grow">
                    <div className="title">{task.title}</div>
                    <div className="meta">
                      {task.project?.name} · updated {formatRelative(task.updatedAt)}
                    </div>
                  </div>
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}