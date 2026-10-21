import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Project } from '../types';

interface ProjectFormModalProps {
  project: Project | null; // null => create
  onClose: () => void;
  onSaved: (project: Project) => void;
  onDeleted?: (projectId: number) => void;
}

export function ProjectFormModal({
  project,
  onClose,
  onSaved,
  onDeleted,
}: ProjectFormModalProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave() {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = project
        ? await api<Project>(`/projects/${project.id}`, {
            method: 'PUT',
            body: { name: name.trim(), description },
          })
        : await api<Project>('/projects', {
            method: 'POST',
            body: { name: name.trim(), description },
          });
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!project || !onDeleted) return;
    if (!window.confirm(`Delete project "${project.name}"? All of its tasks will be removed too.`)) {
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api(`/projects/${project.id}`, { method: 'DELETE' });
      onDeleted(project.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
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
          <h3>{project ? 'Edit project' : 'New project'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label>Name *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
            />
          </div>
        </div>

        <div className="modal-footer">
          <div className="spacer">
            {project && onDeleted && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving}>
                Delete project
              </button>
            )}
          </div>
          <div className="footer-actions">
            <button className="btn" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}