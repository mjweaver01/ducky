import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import { Activity, Key, Globe, Settings, LogOut, BookOpen, Menu, X } from 'lucide-react';
import { authAPI, userAPI, type User } from '../api';
import DuckIcon from '../components/DuckIcon';
import QuackingDuck from '../components/QuackingDuckIcon';
import TokensTab from '../components/TokensTab';
import TunnelsTab from '../components/TunnelsTab';
import DomainsTab from '../components/DomainsTab';
import SettingsTab from '../components/SettingsTab';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const loadUser = async () => {
    try {
      const userData = await userAPI.getProfile();
      setUser(userData);
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        authAPI.clearToken();
        navigate('/login', { replace: true });
        return;
      }
      console.error('Failed to load user:', error);
      authAPI.clearToken();
      navigate('/login', { replace: true });
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
        <QuackingDuck size={75} wobble autoQuack />
      </div>
    );
  }

  if (!user) {
    authAPI.clearToken();
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className={`dashboard${mobileMenuOpen ? ' dashboard-mobile-menu-open' : ''}`}>
      {/* Mobile header: logo + hamburger */}
      <header className="dashboard-mobile-header" aria-hidden="true">
        <div className="dashboard-mobile-header-inner">
          <div className="logo">
            <DuckIcon size={28} className="logo-icon" />
            <span className="logo-text">ducky</span>
          </div>
          <button
            type="button"
            className="dashboard-hamburger"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Overlay when mobile menu is open */}
      <div
        className="dashboard-overlay"
        aria-hidden="true"
        onClick={() => setMobileMenuOpen(false)}
      />

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <DuckIcon size={28} className="logo-icon" />
            <span className="logo-text">ducky</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Activity size={20} className="nav-icon" />
            Tunnels
          </NavLink>
          <NavLink
            to="/dashboard/tokens"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Key size={20} className="nav-icon" />
            Auth Tokens
          </NavLink>
          <NavLink
            to="/dashboard/domains"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Globe size={20} className="nav-icon" />
            Custom Domains
          </NavLink>
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Settings size={20} className="nav-icon" />
            Settings
          </NavLink>

          <div className="nav-divider" />

          <Link to="/docs" className="nav-item">
            <BookOpen size={20} className="nav-icon" />
            Docs
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
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
          >
            <LogOut size={16} />
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
