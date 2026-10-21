import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { FilterBar, EMPTY_FILTERS, type TaskFilters } from '../components/FilterBar';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { TaskCard } from '../components/TaskCard';
import { TaskModal } from '../components/TaskModal';
import { useAuth } from '../context/AuthContext';
import {
  STATUSES,
  STATUS_LABELS,
  type Project,
  type Status,
  type Task,
  type User,
} from '../types';

export default function ProjectBoard() {
  const { id } = useParams();
  const projectId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<TaskFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [boardError, setBoardError] = useState('');
  const [dropColumn, setDropColumn] = useState<Status | null>(null);
  const [projectFormOpen, setProjectFormOpen] = useState(false);

  // undefined = closed, null = create new, Task = editing.
  const [modalTask, setModalTask] = useState<Task | null | undefined>(undefined);
  const [modalStatus, setModalStatus] = useState<Status>('todo');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, t, u, allProjects] = await Promise.all([
          api<Project>(`/projects/${projectId}`),
          api<Task[]>(`/tasks?projectId=${projectId}`),
          api<User[]>('/users'),
          api<Project[]>('/projects'),
        ]);
        if (cancelled) return;
        setProject(p);
        setTasks(t);
        setUsers(u);
        setProjects(allProjects);
        setLoadError('');
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load project');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q && !task.title.toLowerCase().includes(q)) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignee !== '') {
        const wanted = Number(filters.assignee);
        if (task.assignedTo !== wanted) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const columns = useMemo(
    () =>
      STATUSES.map((status) => ({
        status,
        tasks: filtered.filter((t) => t.status === status),
      })),
    [filtered],
  );

  async function moveTask(dragEvent: DragEvent, status: Status) {
    dragEvent.preventDefault();
    setDropColumn(null);
    const raw = dragEvent.dataTransfer.getData('text/task-id');
    const taskId = Number(raw);
    if (!Number.isInteger(taskId)) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    try {
      const updated = await api<Task>(`/tasks/${taskId}`, {
        method: 'PUT',
        body: { status },
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setBoardError('');
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Failed to move task');
    }
  }

  function handleTaskSaved(saved: Task) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      return exists ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev];
    });
  }

  function handleTaskDeleted(taskId: number) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="empty-state">
        <h3>Project not found</h3>
        <p className="muted">{loadError}</p>
        <button className="btn mt-8" onClick={() => navigate('/projects')}>
          Back to projects
        </button>
      </div>
    );
  }

  const canEditProject = canManage || project.createdBy === user?.id;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>{project.name}</h2>
          <p className="sub">
            <Link to="/projects">Projects</Link> / {project.name}
            {project.description ? ` · ${project.description}` : ''}
          </p>
        </div>
        <div className="actions">
          {canEditProject && (
            <button className="btn" onClick={() => setProjectFormOpen(true)}>
              Edit project
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setModalTask(null)}>
            + Create task
          </button>
        </div>
      </div>

      {boardError && <div className="error-banner">{boardError}</div>}

      <FilterBar filters={filters} onChange={setFilters} users={users} />

      <div className="board">
        {columns.map(({ status, tasks: columnTasks }) => (
          <div
            key={status}
            className={`board-column${dropColumn === status ? ' board-column--drop' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDragEnter={() => setDropColumn(status)}
            onDragLeave={() => setDropColumn((prev) => (prev === status ? null : prev))}
            onDrop={(e) => moveTask(e, status)}
          >
            <div className="board-column-header">
              <h3>
                {STATUS_LABELS[status]}
                <span className="column-count">{columnTasks.length}</span>
              </h3>
              <button
                className="column-add"
                title={`Create task in ${STATUS_LABELS[status]}`}
                onClick={() => {
                  setModalStatus(status);
                  setModalTask(null);
                }}
              >
                +
              </button>
            </div>

            <div className="column-cards">
              {columnTasks.length === 0 && (
                <div className="board-column-empty">Drop tasks here</div>
              )}
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} onClick={(t) => setModalTask(t)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {projectFormOpen && (
        <ProjectFormModal
          project={project}
          onClose={() => setProjectFormOpen(false)}
          onSaved={(saved) => {
            setProject(saved);
            setProjectFormOpen(false);
          }}
          onDeleted={() => navigate('/projects')}
        />
      )}

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          projectId={projectId}
          defaultStatus={modalStatus}
          users={users}
          projects={projects}
          onClose={() => setModalTask(undefined)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}

      <p className="muted mt-8" style={{ fontSize: 12 }}>
        Tip: drag a card between columns to change its status.
        {!canManage && ' Employees can move tasks assigned to them.'}
      </p>
    </div>
  );
}