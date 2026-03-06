import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { authAPI } from '../api';
import { useMetadata } from '../hooks/useMetadata';
import { pageMetadata } from '../metadata';
import './AuthPages.css';

const ForgotPasswordPage: React.FC = () => {
  useMetadata(pageMetadata.forgotPassword);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setDevResetUrl('');
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      setSuccess(true);

      if (response.resetUrl) {
        setDevResetUrl(response.resetUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Logo size="lg" className="auth-logo-centered" />
        <div className="auth-card">
          <div className="auth-header">
            <h1>Forgot password?</h1>
            <p>Enter your email and we'll send you a reset link</p>
          </div>

          {error && <div className="error">{error}</div>}

          {success && (
            <div className="success">
              <p>If an account exists with that email, a password reset link has been sent.</p>
              {devResetUrl && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--dark)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                >
                  <strong>Dev mode:</strong>{' '}
                  <a href={devResetUrl} style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>
                    {devResetUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} action="#" method="post">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                disabled={success}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || success}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Remember your password? <Link to="/login">Log in</Link>
            </p>
            <p>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
