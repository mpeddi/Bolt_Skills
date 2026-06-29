import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        setSuccess('Account created! You can now sign in.');
        setMode('signin');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">W</div>
          <div className="auth-logo-text">WorkSpace</div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          {mode === 'signin' ? 'Welcome back' : 'Create an account'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
          {mode === 'signin'
            ? 'Sign in to access your enterprise dashboard.'
            : 'Connect your tools. Work from one place.'}
        </p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              className={`form-input${error && !email ? ' error' : ''}`}
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ padding: '10px', justifyContent: 'center', marginTop: 4 }}
          >
            {loading ? <span className="spinner" /> : null}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <hr className="divider" style={{ margin: '20px 0' }} />

        <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="btn-ghost"
            style={{ fontSize: 13, padding: 0, fontWeight: 600, color: 'var(--color-primary)', background: 'none' }}
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
