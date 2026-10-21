import { PRIORITY_LABELS, STATUS_LABELS, type Priority, type Status } from '../types';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge badge-status--${status}`}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({
  priority,
  showLabel = true,
}: {
  priority: Priority;
  showLabel?: boolean;
}) {
  return (
    <span
      className={`priority-indicator${priority === 'high' ? ' priority-indicator--high' : ''}`}
    >
      <span className={`priority-dot priority-dot--${priority}`} />
      {showLabel && PRIORITY_LABELS[priority]}
    </span>
  );
}