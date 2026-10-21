import { initials, isOverdue, formatDate } from '../lib/format';
import type { Task } from '../types';
import { PriorityBadge } from './badges';

export function TaskCard({ task, onClick }: { task: Task; onClick: (task: Task) => void }) {
  const labels = task.labels ? task.labels.split(',').filter(Boolean) : [];
  const overdue = isOverdue(task.dueDate) && task.status !== 'done';

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/task-id', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
    >
      <div className="task-title">{task.title}</div>

      {labels.length > 0 && (
        <div className="labels-row">
          {labels.map((label) => (
            <span key={label} className="label-chip">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="task-footer">
        <PriorityBadge priority={task.priority} />
        {task.assignee ? (
          <span className="avatar avatar-sm" title={`Assigned to ${task.assignee.name}`}>
            {initials(task.assignee.name)}
          </span>
        ) : (
          <span
            className="avatar avatar-sm"
            style={{ background: '#dfe1e6', color: '#5e6c84' }}
            title="Unassigned"
          >
            —
          </span>
        )}
        {task.dueDate && (
          <span className={`due${overdue ? ' due--overdue' : ''}`} title="Due date">
            📅 {formatDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}