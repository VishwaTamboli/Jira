import { useNotifications } from '../context/NotificationsContext';
import { formatRelative } from '../lib/format';

export default function Notifications() {
  const { notifications, markRead } = useNotifications();

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Notifications</h2>
          <p className="sub">
            {notifications.filter((n) => !n.read).length} unread
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state">
          <h3>No notifications</h3>
          <p className="muted">Notifications about your tasks will show up here.</p>
        </div>
      ) : (
        <div className="list-card">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notif-item${notification.read ? '' : ' notif-item--unread'}`}
            >
              <span style={{ fontSize: 16 }}>{notification.read ? '🔕' : '🔔'}</span>
              <div className="grow" style={{ flex: 1, minWidth: 0 }}>
                <div className="notif-msg">{notification.message}</div>
                <div className="notif-time">{formatRelative(notification.createdAt)}</div>
              </div>
              {!notification.read && (
                <button className="btn btn-sm" onClick={() => markRead(notification.id)}>
                  Mark as read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}