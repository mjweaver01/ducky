import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Crown,
  Zap,
  Building2,
  Link2,
} from 'lucide-react';
import { userAPI, tokensAPI, type User as UserType, type Token } from '../api';
import { Link } from 'react-router-dom';
import api from '../api/client';
import './SettingsTab.css';

interface SettingsTabProps {
  user: UserType | null;
  onUpdate: () => void;
}

type MessageState = { type: 'success' | 'error'; text: string } | null;

const SettingsTab: React.FC<SettingsTabProps> = ({ user, onUpdate }) => {
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<MessageState>(null);
  const [passwordMessage, setPasswordMessage] = useState<MessageState>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    if (user?.plan !== 'free') {
      tokensAPI
        .list()
        .then(setTokens)
        .catch(() => {});
    }
  }, [user?.plan]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    try {
      await userAPI.updateProfile({ fullName, email });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully.' });
      onUpdate();
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update profile.',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);
    try {
      await userAPI.changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to change password.',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const response = await api.post<{ url: string }>('/billing/create-portal-session');
      window.location.href = response.data.url;
    } catch (err: any) {
      alert('Failed to open billing portal. Please try again.');
      setBillingLoading(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro':
        return Crown;
      case 'enterprise':
        return Building2;
      default:
        return Zap;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'rgb(234, 179, 8)';
      case 'enterprise':
        return 'rgb(147, 51, 234)';
      default:
        return 'rgb(59, 130, 246)';
    }
  };

  const getPlanDisplay = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'Pro Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      default:
        return 'Free Plan';
    }
  };

  const renderMessage = (msg: MessageState) => {
    if (!msg) return null;
    const isSuccess = msg.type === 'success';
    return (
      <div className={isSuccess ? 'message-success' : 'error'}>
        <div className="settings-message-icon">
          {isSuccess ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account details and security</p>
      </div>

      <div className="settings-grid">
        <div className="card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <User size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Profile</h2>
              <p className="settings-card-subtitle">Update your name and email address</p>
            </div>
          </div>

          {renderMessage(profileMessage)}

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={profileLoading}>
              {profileLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Subscription</h2>
              <p className="settings-card-subtitle">Manage your plan and billing</p>
            </div>
          </div>

          <div className="plan-badge">
            {React.createElement(getPlanIcon(user?.plan || 'free'), {
              size: 24,
              style: { color: getPlanColor(user?.plan || 'free') },
            })}
            <div className="plan-badge-content">
              <div className="plan-badge-title">{getPlanDisplay(user?.plan || 'free')}</div>
              {user?.plan === 'free' ? (
                <div className="plan-badge-subtitle">
                  Upgrade to unlock static URLs and custom domains
                </div>
              ) : (
                <div className="plan-badge-subtitle">
                  {user?.planExpiresAt &&
                    `Renews on ${new Date(user.planExpiresAt).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>

          <div className="settings-actions">
            {user?.plan === 'free' ? (
              <Link to="/pricing" className="btn btn-primary">
                <Crown size={16} />
                Upgrade Plan
              </Link>
            ) : (
              <button
                onClick={handleManageBilling}
                className="btn btn-secondary"
                disabled={billingLoading}
              >
                {billingLoading ? 'Loading…' : 'Manage Billing'}
              </button>
            )}
            {user?.plan !== 'free' && (
              <Link to="/pricing" className="btn btn-secondary">
                View Plans
              </Link>
            )}
          </div>
        </div>

        <div className="card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Link2 size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Static Address</h2>
              <p className="settings-card-subtitle">Your permanent tunnel URLs</p>
            </div>
          </div>

          {user?.plan === 'free' ? (
            <div className="plan-badge">
              <Crown
                size={24}
                style={{ color: 'rgb(234, 179, 8)', opacity: 0.5 }}
              />
              <div className="plan-badge-content">
                <div className="plan-badge-title">Static URLs are available on Pro and Enterprise</div>
                <div className="plan-badge-subtitle">
                  Upgrade to get a permanent URL that never changes
                </div>
              </div>
            </div>
          ) : tokens.length === 0 ? (
            <div className="plan-badge">
              <Link2 size={24} style={{ color: 'rgb(59, 130, 246)' }} />
              <div className="plan-badge-content">
                <div className="plan-badge-title">No tokens yet</div>
                <div className="plan-badge-subtitle">
                  Create an auth token to get your static URL
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              {tokens
                .filter((token) => token.subdomain)
                .map((token) => (
                  <div
                    key={token.id}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                        {token.name}
                      </div>
                      <code
                        style={{
                          fontSize: '0.875rem',
                          color: 'rgb(59, 130, 246)',
                        }}
                      >
                        https://{token.subdomain}.ducky.wtf
                      </code>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <div className="settings-actions">
            {user?.plan === 'free' ? (
              <Link to="/pricing" className="btn btn-primary">
                <Crown size={16} />
                Upgrade Plan
              </Link>
            ) : (
              <Link to="/dashboard/tokens" className="btn btn-secondary">
                Manage in Auth Tokens →
              </Link>
            )}
          </div>
        </div>

        <div className="card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Change Password</h2>
              <p className="settings-card-subtitle">
                Keep your account secure with a strong password
              </p>
            </div>
          </div>

          {renderMessage(passwordMessage)}

          <form onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <small>At least 8 characters</small>
            </div>
            <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
              {passwordLoading ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
