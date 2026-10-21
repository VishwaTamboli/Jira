import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NotificationsProvider, useNotifications } from '../context/NotificationsContext';
import { useAuth } from '../context/AuthContext';
import { initials } from '../lib/format';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/my-tasks', label: 'My Tasks', icon: '✅' },
  { to: '/notifications', label: 'Notifications', icon: '🔔', badge: true },
  { to: '/profile', label: 'Profile', icon: '👤' },
];

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/my-tasks': 'My Tasks',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
};

function Shell() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith('/projects/') ? 'Project Board' : 'Dashboard');

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="logo-mark">📋</span>
          <h1>Jira Clone</h1>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.badge && unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="sidebar-user">
            <div className="user-line">
              <span className="avatar">{initials(user.name)}</span>
              <div className="user-meta">
                <div className="user-name">{user.name}</div>
                <div className="user-sub">{user.email}</div>
              </div>
            </div>
            <button className="btn logout-btn" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </aside>

      <div className="app-main">
        <header className="topbar">
          <h2>{title}</h2>
          <div className="topbar-right">
            <button
              className="bell"
              title="Notifications"
              onClick={() => navigate('/notifications')}
            >
              🔔
              {unreadCount > 0 && <span className="bell-dot">{unreadCount}</span>}
            </button>
            <Link to="/profile" className="topbar-avatar">
              <span className="avatar">{user ? initials(user.name) : ''}</span>
              <span>{user?.name}</span>
            </Link>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <NotificationsProvider>
      <Shell />
    </NotificationsProvider>
  );
}