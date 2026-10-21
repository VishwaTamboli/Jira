import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatRelative, initials } from '../lib/format';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Priority,
  type Project,
  type Status,
  type Task,
  type TaskComment,
  type User,
} from '../types';

interface TaskModalProps {
  task: Task | null; // null => create a new task
  projectId: number;
  defaultStatus?: Status;
  users: User[];
  projects: Project[];
  onClose: () => void;
  onSaved: (task: Task) => void;
  onDeleted?: (taskId: number) => void;
}

export function TaskModal({
  task,
  projectId,
  defaultStatus,
  users,
  projects,
  onClose,
  onSaved,
  onDeleted,
}: TaskModalProps) {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  // Anyone can assign/drag, change the assignee of any task; other fields are
  // editable by managers/admins or by the assignee/creator of the task.
  const canEditAll = canManage || !task || task.assignedTo === user?.id || task.createdBy === user?.id;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<Status>(task?.status ?? defaultStatus ?? 'todo');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [labels, setLabels] = useState(task?.labels ?? '');
  const [assignee, setAssignee] = useState(task ? String(task.assignedTo ?? '') : '');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.slice(0, 10) : '');
  const [project, setProject] = useState(task ? String(task.projectId) : String(projectId));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // ----- comments (only for existing tasks) -----
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsError, setCommentsError] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!task) return;
    api<TaskComment[]>(`/tasks/${task.id}/comments`)
      .then((list) => {
        if (!cancelled) setComments(list);
      })
      .catch(() => {
        /* comment load failures are non-blocking */
      });
    return () => {
      cancelled = true;
    };
  }, [task]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const assigneeOptions = users;

  async function handleSave() {
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    setSaving(true);
    setError('');

    const payload: Record<string, unknown> = {};
    if (canEditAll) {
      payload.title = title.trim();
      payload.description = description;
      payload.status = status;
      payload.priority = priority;
      payload.labels = labels; // comma-separated text, normalized by the server
      payload.dueDate = dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : null;
    }
    // Moving a task between projects remains a manager/admin action.
    if (canManage) {
      payload.projectId = Number(project);
    } else if (!task) {
      payload.projectId = Number(project);
    }
    // Anyone can assign any task to any user.
    payload.assignedTo = assignee === '' ? null : Number(assignee);

    try {
      const saved = task
        ? await api<Task>(`/tasks/${task.id}`, { method: 'PUT', body: payload })
        : await api<Task>('/tasks', { method: 'POST', body: payload });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task || !onDeleted) return;
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    setSaving(true);
    setError('');
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      onDeleted(task.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  }

  async function handleAddComment() {
    if (!task || !commentText.trim()) return;
    setAddingComment(true);
    setCommentsError('');
    try {
      const created = await api<TaskComment>(`/tasks/${task.id}/comments`, {
        method: 'POST',
        body: { body: commentText },
      });
      setComments((prev) => [...prev, created]);
      setCommentText('');
    } catch (e) {
      setCommentsError(e instanceof Error ? e.message : 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <h3>{task ? 'Edit task' : 'Create task'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          {task && (
            <div className="modal-meta">
              <span>
                <strong>Project</strong>
                {task.project?.name ?? `#${task.projectId}`}
              </span>
              <span>
                <strong>Assignee</strong>
                {task.assignee ? `${task.assignee.name} (${task.assignee.email})` : 'Unassigned'}
              </span>
              <span>
                <strong>Created</strong>
                {formatDateTime(task.createdAt)}
                {task.creator?.name ? ` · ${task.creator.name}` : ''}
              </span>
              <span>
                <strong>Updated</strong>
                {formatDateTime(task.updatedAt)}
              </span>
            </div>
          )}

          <div className="field">
            <label>Title *</label>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              disabled={!canEditAll}
              autoFocus
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs to be done?"
              disabled={!canEditAll}
            />
          </div>

          <div className="form-row">
            <div className="field">
              <label>Status</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
                disabled={!canEditAll}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                disabled={!canEditAll}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            {canManage && (
              <div className="field">
                <label>Project</label>
                {task ? (
                  <select className="input" value={project} onChange={(e) => setProject(e.target.value)}>
                    {(projects.length > 0
                      ? projects
                      : task.project
                        ? [task.project]
                        : []
                    ).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input className="input" disabled value={projectId} />
                )}
              </div>
            )}
            <div className="field">
              <label>Due date</label>
              <input
                className="input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!canEditAll}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="field">
              <label>Assignee</label>
              <select
                className="input"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Labels</label>
              <input
                className="input"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="frontend, bug, design"
                disabled={!canEditAll}
              />
              <span className="hint">Comma separated</span>
            </div>
          </div>

          {task && (
            <div className="comments-section">
              <h4>
                Comments <span className="column-count">{comments.length}</span>
              </h4>

              {commentsError && <div className="error-banner">{commentsError}</div>}

              <div className="comment-list">
                {comments.length === 0 && <p className="muted">No comments yet.</p>}
                {comments.map((comment) => (
                  <div className="comment" key={comment.id}>
                    <span className="avatar avatar-sm">{initials(comment.author.name)}</span>
                    <div className="comment-body">
                      <div className="comment-meta">
                        {comment.author.name} · {formatRelative(comment.createdAt)}
                      </div>
                      <div className="comment-text">{comment.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="comment-add">
                <textarea
                  className="input"
                  rows={2}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddComment}
                  disabled={addingComment || !commentText.trim()}
                >
                  {addingComment ? 'Adding…' : 'Comment'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="spacer">
            {task && canManage && onDeleted && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving}>
                Delete task
              </button>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}