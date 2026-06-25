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
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-card__title">Road2IIM</h1>
        <p className="login-card__sub">{isSignUp ? 'Create a new account.' : 'Sign in to continue.'}</p>
        <label style={{ display: 'block', marginBottom: '14px' }}>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label style={{ display: 'block', marginBottom: '14px', position: 'relative' }}>
          Password
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '15px',
                padding: '4px',
                color: 'var(--text-secondary)',
                lineHeight: 1
              }}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
        </label>
        {error && <div className="status status--error">{error}</div>}
        <button type="submit" className="btn btn--primary" style={{ width: '100%', display: 'block', padding: '12px' }} disabled={submitting}>
          {submitting ? (isSignUp ? 'Signing up…' : 'Signing in…') : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
        <div style={{ marginTop: '16px', fontSize: '12.5px', textAlign: 'center' }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setIsSignUp(!isSignUp); setError(null); }} style={{ textDecoration: 'underline', color: 'var(--blue)' }}>
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </form>
    </div>
  );
}
