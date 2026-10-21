import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@demo.com' },
  { role: 'Manager', email: 'manager@demo.com' },
  { role: 'Employee', email: 'employee@demo.com' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-mark">📋</span>
          <h1>Jira Clone</h1>
        </div>
        <p className="auth-subtitle">Sign in to continue</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">
          No account? <Link to="/register">Create one</Link>
        </p>

        <div className="panel mt-8">
          <div className="panel-header">
            <h3>Demo accounts</h3>
          </div>
          <div className="status-breakdown">
            {DEMO_ACCOUNTS.map((acc) => (
              <div key={acc.email} className="status-row">
                <div className="status-row-label">
                  <span>{acc.role}</span>
                  <span>{acc.email}</span>
                </div>
              </div>
            ))}
            <div className="muted" style={{ fontSize: 12 }}>
              Password for all demo accounts: <strong>demo123</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}