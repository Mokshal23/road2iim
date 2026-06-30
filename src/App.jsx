import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './components/Login';
import { useAuth, logout } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useUserRole } from './hooks/useUserRole';
import { firebaseConfigured } from './firebase';
import Toast from './components/Toast';
import { GlobalErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/useAppStore';
import HelpdeskModal from './components/HelpdeskModal';

// Lazy load visual pages to optimize bundle chunking
const Home = React.lazy(() => import('./pages/Home'));
const Mentor = React.lazy(() => import('./pages/Mentor'));

export default function App() {
  const { theme, toggle } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, registerRole } = useUserRole(user);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSupport, setShowSupport] = useState(false);
  const activeTab = useAppStore((state) => state.activeTab);
  const setActiveTab = useAppStore((state) => state.setActiveTab);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      useAppStore.getState().showToast('⚡ Back online! Synchronizing local cache...', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      useAppStore.getState().showToast('⚠️ Working offline. Changes are saved locally.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const authRequired = firebaseConfigured;
  const showNav = user && role && role !== 'unregistered';
  const tabs = role === 'student' ? [
    { key: 'today', label: 'Today' },
    { key: 'log', label: 'Log session' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'aeon', label: 'Aeon log' },
    { key: 'mocks', label: 'Mock tests' },
    { key: 'vocab', label: 'Vocab bank' },
  ] : [
    { key: 'today', label: 'Today' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'aeon', label: 'Aeon log' },
    { key: 'mocks', label: 'Mock tests' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'vocab', label: 'Vocab bank' },
  ];

  let content;

  if (authRequired && (authLoading || roleLoading)) {
    content = (
      <div className="auth-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="spinner" style={{ fontSize: 24 }}>⏳</div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Initializing Road2IIM...</p>
      </div>
    );
  } else if (authRequired && !user) {
    content = <Login />;
  } else if (authRequired && role === 'unregistered') {
    content = <RoleSelection onSelect={registerRole} />;
  } else {
    content = (
      <BrowserRouter>
        <header className="app-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link to="/" className="app-header__title">Road2IIM</Link>
            <span 
              className={`status-dot ${isOnline ? 'status-dot--online' : 'status-dot--offline'}`}
              title={isOnline ? 'Connected to Cloud Sync' : 'Working Offline (Local Cache Active)'}
            />
          </div>

          {showNav && (
            <nav className="header-tabs">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  className={`header-tab ${activeTab === t.key ? 'header-tab--active' : ''}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}

          <div className="app-header__actions">
            {showNav && (
              <button 
                className="icon-btn support-btn" 
                onClick={() => setShowSupport(true)} 
                title="Report Portal Issue" 
                style={{ fontSize: '15px' }}
                aria-label="Report portal issue"
              >
                🐞
              </button>
            )}
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
        
        {showSupport && (
          <HelpdeskModal 
            userId={user?.uid} 
            userEmail={user?.email} 
            role={role} 
            onClose={() => setShowSupport(false)} 
          />
        )}
        
        <Toast />
      </BrowserRouter>
    );
  }

  return (
    <GlobalErrorBoundary>
      {content}
    </GlobalErrorBoundary>
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
