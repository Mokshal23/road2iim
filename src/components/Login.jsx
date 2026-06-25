import { useState } from 'react';
import { login, signUp } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      const code = err?.code || '';
      if (isSignUp) {
        if (code === 'auth/email-already-in-use') {
          setError('This email is already in use. Try signing in instead.');
        } else if (code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else if (code === 'auth/weak-password') {
          setError('Password must be at least 6 characters long.');
        } else {
          setError('Failed to create account. Please try again.');
        }
      } else {
        if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
          setError('Incorrect email or password.');
        } else if (code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
        } else {
          setError('Failed to sign in. Please try again.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      {/* Dynamic ambient background orbs */}
      <div className="auth-orb auth-orb--1"></div>
      <div className="auth-orb auth-orb--2"></div>

      <div className="login-container">
        <form className="login-card" onSubmit={handleSubmit}>
          {/* Stylized geometric logo representing upward growth */}
          <div className="login-logo">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" stroke="url(#logo-grad)" strokeWidth="3" fill="rgba(31, 133, 119, 0.05)"/>
              <path d="M14 34L22 26L28 32L36 18" stroke="url(#logo-grad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M30 18H36V24" stroke="url(#logo-grad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              <defs>
                <linearGradient id="logo-grad" x1="14" y1="34" x2="36" y2="18" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="var(--teal)" />
                  <stop offset="100%" stopColor="var(--blue)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1 className="login-card__title">Road2IIM</h1>
          <p className="login-card__sub">
            {isSignUp ? 'Create your personal account to get started.' : 'Sign in to access your CAT prep control room.'}
          </p>

          {/* Sliding authentication mode tab toggle */}
          <div className="auth-toggle-tabs">
            <button
              type="button"
              className={`auth-toggle-tab ${!isSignUp ? 'auth-toggle-tab--active' : ''}`}
              onClick={() => { setIsSignUp(false); setError(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-toggle-tab ${isSignUp ? 'auth-toggle-tab--active' : ''}`}
              onClick={() => { setIsSignUp(true); setError(null); }}
            >
              Register
            </button>
          </div>

          <div className="form-group">
            <span className="form-label">Email Address</span>
            <div className="input-wrapper">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <span className="form-label">Password</span>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? "Minimum 6 characters" : "••••••••"}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          {error && <div className="status status--error auth-error-status">{error}</div>}

          <button
            type="submit"
            className="btn btn--primary auth-submit-btn"
            disabled={submitting}
          >
            {submitting ? (isSignUp ? 'Creating Account…' : 'Verifying Credentials…') : (isSignUp ? 'Create Free Account' : 'Sign In')}
          </button>

          <div className="auth-footer-note">
            Secure client-side end-to-end sync via Firestore.
          </div>
        </form>
      </div>
    </div>
  );
}
