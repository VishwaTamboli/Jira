import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';
import type { Project } from '../types';

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  // Anyone can create a project; creators (and admins/managers) can manage theirs.
  function canManageProject(project: Project): boolean {
    return canManage || project.createdBy === user?.id;
  }

  const load = useCallback(async () => {
    try {
      const list = await api<Project[]>('/projects');
      setProjects(list);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleSaved(saved: Project) {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  }

  function handleDeleted(id: number) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Delete project "${name}"? All of its tasks will be removed too.`)) return;
    try {
      await api(`/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project');
    }
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
          <h2>Projects</h2>
          <p className="sub">{projects.length} project{projects.length === 1 ? '' : 's'} in total</p>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            + New project
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>No projects yet</h3>
          <p>Create your first project to get started.</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <div className="project-card" key={project.id}>
              <h3>{project.name}</h3>
              <p className="desc">{project.description || 'No description.'}</p>
              <div className="meta">
                {formatDate(project.createdAt)} · by {project.creator?.name ?? '—'} ·{' '}
                {project._count?.tasks ?? 0} task{(project._count?.tasks ?? 0) === 1 ? '' : 's'}
              </div>
              <div className="project-actions">
                <button className="btn btn-primary btn-sm" onClick={() => navigate(`/projects/${project.id}`)}>
                  Open board
                </button>
                {canManageProject(project) && (
                  <>
                    <button className="btn btn-sm" onClick={() => setEditing(project)}>
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(project.id, project.name)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(formOpen || editing) && (
        <ProjectFormModal
          project={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}