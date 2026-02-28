import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { authAPI, userAPI, type User } from '../api';
import TokensTab from '../components/TokensTab';
import TunnelsTab from '../components/TunnelsTab';
import DomainsTab from '../components/DomainsTab';
import SettingsTab from '../components/SettingsTab';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await userAPI.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authAPI.clearToken();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🦆</span>
            <span className="logo-text">ducky</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/dashboard" className="nav-item">
            <span className="nav-icon">📊</span>
            Tunnels
          </Link>
          <Link to="/dashboard/tokens" className="nav-item">
            <span className="nav-icon">🔑</span>
            Auth Tokens
          </Link>
          <Link to="/dashboard/domains" className="nav-item">
            <span className="nav-icon">🌐</span>
            Custom Domains
          </Link>
          <Link to="/dashboard/settings" className="nav-item">
            <span className="nav-icon">⚙️</span>
            Settings
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.fullName || 'User'}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<TunnelsTab />} />
          <Route path="/tokens" element={<TokensTab />} />
          <Route path="/domains" element={<DomainsTab />} />
          <Route path="/settings" element={<SettingsTab user={user} onUpdate={loadUser} />} />
        </Routes>
      </main>
    </div>
  );
};

export default DashboardPage;
