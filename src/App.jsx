import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Mentor from './pages/Mentor';
import Login from './components/Login';
import { useAuth, logout } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { firebaseConfigured } from './firebase';

export default function App() {
  const { theme, toggle } = useTheme();
  const { user, loading } = useAuth();

  // If Firebase isn't configured yet, fall through to the normal app so the
  // existing ConfigWarning screens (which explain what's missing) still show.
  const authRequired = firebaseConfigured;

  if (authRequired && loading) {
    return <div className="auth-loading">Loading…</div>;
  }
  if (authRequired && !user) {
    return <Login />;
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
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mentor" element={<Mentor />} />
      </Routes>
    </BrowserRouter>
  );
}
