import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import PasswordInput from '../components/PasswordInput';
import { authAPI } from '../api';
import { useMetadata } from '../hooks/useMetadata';
import { pageMetadata } from '../metadata';
import './AuthPages.css';

const ResetPasswordPage: React.FC = () => {
  useMetadata(pageMetadata.resetPassword);

  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Debug: log token
  useEffect(() => {
    console.log('Reset token:', token ? `${token.substring(0, 10)}...` : 'MISSING');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword(token, newPassword);
      setSuccess(true);

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
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
            <h1>Reset password</h1>
            <p>Enter your new password below</p>
          </div>

          {!token && (
            <div className="error">
              No reset token found in URL. Please use the link from your email or the forgot
              password page.
            </div>
          )}

          {error && <div className="error">{error}</div>}

          {success && (
            <div className="success">Password reset successfully! Redirecting to login...</div>
          )}

          <form onSubmit={handleSubmit} action="#" method="post">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
              />
              <small>Must be at least 8 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading || success}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Remember your password? <Link to="/login">Log in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
