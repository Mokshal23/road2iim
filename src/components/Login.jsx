import { useState } from 'react';
import { login, signUp } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    } catch {
      if (isSignUp) {
        setError('Failed to create account. Make sure the password is at least 6 characters.');
      } else {
        setError('Wrong email or password.');
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
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label>
          Password
          <input type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="status status--error">{error}</div>}
        <button type="submit" className="btn btn--primary" disabled={submitting}>
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
