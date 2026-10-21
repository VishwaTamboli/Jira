import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type User } from '../types';

export interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  assignee: string;
}

export const EMPTY_FILTERS: TaskFilters = {
  search: '',
  status: '',
  priority: '',
  assignee: '',
};

interface FilterBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  users: User[];
  showAssignee?: boolean;
}

export function FilterBar({ filters, onChange, users, showAssignee = true }: FilterBarProps) {
  return (
    <div className="board-filters">
      <div className="filter-search">
        <input
          className="input"
          type="search"
          placeholder="Search by task title…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      <select
        className="input"
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <select
        className="input"
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
      >
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>

      {showAssignee && (
        <select
          className="input"
          value={filters.assignee}
          onChange={(e) => onChange({ ...filters, assignee: e.target.value })}
        >
          <option value="">All assignees</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}