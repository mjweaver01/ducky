import React, { useState } from 'react';
import { User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { userAPI, type User as UserType } from '../api';

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

  const renderMessage = (msg: MessageState) => {
    if (!msg) return null;
    const isSuccess = msg.type === 'success';
    return (
      <div className={isSuccess ? 'message-success' : 'error'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(251, 191, 36, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              flexShrink: 0,
            }}
          >
            <User size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Profile</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Update your name and email address
            </p>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(251, 191, 36, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              flexShrink: 0,
            }}
          >
            <Lock size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Change Password</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
  );
};

export default SettingsTab;
