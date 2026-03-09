import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Key,
  Globe,
  Settings,
  CreditCard,
  LogOut,
  BookOpen,
  Menu,
  X,
  Crown,
  Zap,
  Building2,
  Github,
  Mail,
  Users,
} from 'lucide-react';
import type { User } from '@ducky.wtf/shared';
import { authAPI, userAPI, billingAPI } from '../api';
import DuckIcon from '../components/DuckIcon';
import QuackingDuck from '../components/QuackingDuckIcon';
import Logo from '../components/Logo';
import TokensTab from '../components/dashboard/TokensTab';
import TunnelsTab from '../components/dashboard/TunnelsTab';
import DomainsTab from '../components/dashboard/DomainsTab';
import SettingsTab from '../components/dashboard/SettingsTab';
import SubscriptionTab from '../components/dashboard/SubscriptionTab';
import TeamTab from '../components/dashboard/TeamTab';
import { useMetadata } from '../hooks/useMetadata';
import { pageMetadata } from '../metadata';
import { links } from '../links';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  useMetadata(pageMetadata.dashboard);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadUser();
  }, []);

  // After Stripe checkout success: confirm session (syncs DB) then refetch user so advanced features show
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    const success = params.get('success') === 'true';
    if (!success && !sessionId) return;

    const run = async () => {
      if (sessionId) {
        try {
          await billingAPI.confirmSession(sessionId);
        } catch (e) {
          console.error('Confirm session failed:', e);
        }
      }
      await loadUser();
      // Clear success params from URL so we don't re-run
      const clean = location.pathname;
      if (window.location.search) {
        navigate(clean, { replace: true });
      }
    };
    run();
  }, [location.search]);

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
        return 'rgb(234, 179, 8)'; // gold
      case 'enterprise':
        return 'rgb(147, 51, 234)'; // purple
      default:
        return 'rgb(59, 130, 246)'; // blue
    }
  };

  const getPlanDisplay = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'Pro';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Free';
    }
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
          <Logo to="/dashboard" size="sm" quack="hover" />
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
          <Logo to="/dashboard" size="sm" quack="hover" />
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

          {user?.effectivePlan === 'enterprise' && (
            <NavLink
              to="/dashboard/team"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Users size={20} className="nav-icon" />
              Team
            </NavLink>
          )}

          <NavLink
            to="/dashboard/subscription"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <CreditCard size={20} className="nav-icon" />
            Subscription
          </NavLink>

          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Settings size={20} className="nav-icon" />
            Settings
          </NavLink>

          <div className="nav-divider" />
          <div className="nav-section-label">Support</div>

          <Link to="/docs" className="nav-item nav-item-secondary">
            <BookOpen size={16} className="nav-icon" />
            Docs
          </Link>
          <a
            href={links.githubIssues}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item nav-item-secondary"
          >
            <Github size={16} className="nav-icon" />
            GitHub Issues
          </a>
          <Link to="/contact" className="nav-item nav-item-secondary">
            <Mail size={16} className="nav-icon" />
            Contact
          </Link>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.email?.[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="user-name">{user?.fullName || 'User'}</div>
              <div className="user-plan">
                {React.createElement(getPlanIcon(user?.plan || 'free'), {
                  size: 12,
                  style: { color: getPlanColor(user?.plan || 'free') },
                })}
                <span>{getPlanDisplay(user?.plan || 'free')}</span>
              </div>
            </div>
          </div>
          {user?.plan === 'free' && (
            <Link to="/pricing" className="btn btn-primary btn-sm sidebar-footer-upgrade">
              <Crown size={16} />
              Upgrade to Pro
            </Link>
          )}
          <button onClick={handleLogout} className="btn btn-secondary btn-sm sidebar-footer-logout">
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
          <Route path="/team" element={<TeamTab />} />
          <Route path="/subscription" element={<SubscriptionTab user={user} />} />
          <Route path="/settings" element={<SettingsTab user={user} onUpdate={loadUser} />} />
        </Routes>
      </main>
    </div>
  );
};

export default DashboardPage;
