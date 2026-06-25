import React, { useState, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { useAuth, logout } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useUserRole } from './hooks/useUserRole';
import { firebaseConfigured } from './firebase';

// Lazy load visual pages to optimize bundle chunking
const Home = React.lazy(() => import('./pages/Home'));
const Mentor = React.lazy(() => import('./pages/Mentor'));

export default function App() {
  const { theme, toggle } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, registerRole } = useUserRole(user);

  const authRequired = firebaseConfigured;

  if (authRequired && (authLoading || roleLoading)) {
    return (
      <div className="auth-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner" style={{ fontSize: 24 }}>⏳</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing Road2IIM...</p>
      </div>
    );
  }

  if (authRequired && !user) {
    return <Login />;
  }

  if (authRequired && role === 'unregistered') {
    return <RoleSelection onSelect={registerRole} />;
  }

  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/" className="app-header__title">Road2IIM</Link>
        <span className="app-header__sub">VARC · LRDI · QA tracker</span>
        <div className="app-header__actions">
          <button className="icon-btn theme-toggle" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {authRequired && (
            <button className="btn btn--ghost btn--sm" onClick={logout}>Sign out</button>
          )}
        </div>
      </header>

      <Suspense fallback={<div className="empty" style={{ padding: '60px 20px', textAlign: 'center' }}>Loading dashboard view...</div>}>
        <Routes>
          {role === 'student' ? (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/mentor" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/mentor" element={<Mentor />} />
              <Route path="/" element={<Navigate to="/mentor" replace />} />
              <Route path="*" element={<Navigate to="/mentor" replace />} />
            </>
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function RoleSelection({ onSelect }) {
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) return;
    setSaving(true);
    try {
      await onSelect(role);
    } catch (err) {
      console.error(err);
      alert('Failed to register account type.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg)', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '30px', textAlign: 'center', border: '1px solid var(--border)' }}>
        <h2 style={{ marginBottom: '10px', fontSize: '20px', fontWeight: 600 }}>Account Registration</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px', lineHeight: 1.4 }}>
          Welcome to Road2IIM! Please choose your profile type. This links your access and cannot be changed later.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            background: 'var(--surface)',
            border: role === 'student' ? '2px solid var(--blue)' : '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s'
          }}>
            <input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} />
            <div>
              <strong style={{ display: 'block', fontSize: '14px' }}>Student</strong>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px', lineHeight: 1.3 }}>
                Log sessions, complete mentor tasks, review vocab, and run analytics.
              </span>
            </div>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            background: 'var(--surface)',
            border: role === 'mentor' ? '2px solid var(--blue)' : '1px solid var(--border)',
            borderRadius: '8px',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all 0.15s'
          }}>
            <input type="radio" name="role" value="mentor" checked={role === 'mentor'} onChange={() => setRole('mentor')} />
            <div>
              <strong style={{ display: 'block', fontSize: '14px' }}>Mentor</strong>
              <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px', lineHeight: 1.3 }}>
                Observe linked student progress, assign tasks, and leave feedback comments.
              </span>
            </div>
          </label>

          <button type="submit" className="btn btn--primary" style={{ marginTop: '10px', padding: '12px', fontSize: '13.5px' }} disabled={!role || saving}>
            {saving ? 'Registering Account...' : 'Finish Setup ➔'}
          </button>
        </form>
      </div>
    </div>
  );
}
