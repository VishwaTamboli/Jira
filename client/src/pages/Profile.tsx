import { useAuth } from '../context/AuthContext';
import { initials, formatDate } from '../lib/format';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access. Can manage projects, tasks and assignments.',
  manager: 'Can create projects, tasks, and assign work to employees.',
  employee: 'Can view projects and update tasks assigned to them.',
};

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Profile</h2>
          <p className="sub">Your account information</p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-head">
          <div className="profile-avatar">{initials(user.name)}</div>
          <div>
            <h2>{user.name}</h2>
            <div className="mt-8">
              <span className={`role-badge role-badge--${user.role}`}>{user.role}</span>
            </div>
          </div>
        </div>

        <table className="profile-table">
          <tbody>
            <tr>
              <td className="k">Name</td>
              <td>{user.name}</td>
            </tr>
            <tr>
              <td className="k">Email</td>
              <td>{user.email}</td>
            </tr>
            <tr>
              <td className="k">Role</td>
              <td className="text-capitalize">{ROLE_DESCRIPTIONS[user.role]}</td>
            </tr>
            <tr>
              <td className="k">Member since</td>
              <td>{formatDate(user.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}