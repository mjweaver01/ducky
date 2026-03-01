import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import DuckIcon from './DuckIcon';
import { authAPI } from '../api';
import { docsNavItems } from '../docsNav';
import '../pages/LandingPage.css';

interface MarketingLayoutProps {
  children: React.ReactNode;
}

function isDocsLinkActive(item: { to: string }, pathname: string, hash: string): boolean {
  const hashIdx = item.to.indexOf('#');
  const itemPath = hashIdx === -1 ? item.to : item.to.slice(0, hashIdx);
  const itemHash = hashIdx === -1 ? null : item.to.slice(hashIdx + 1);
  const currentHash = hash ? hash.slice(1) : null;
  if (pathname !== itemPath) return false;
  if (itemHash) return currentHash === itemHash;
  return !currentHash;
}

const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => authAPI.isAuthenticated());
  const location = useLocation();
  const navigate = useNavigate();
  const isOnDocs = location.pathname.startsWith('/docs');

  const handleLogout = () => {
    authAPI.clearToken();
    setIsLoggedIn(false);
    navigate('/');
  };

  // Close mobile menu on route or hash change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Scroll to hash anchor or top on every navigation
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const timer = setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname, location.hash]);

  return (
    <div className={`landing${menuOpen ? ' nav-drawer-open' : ''}`}>
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <Link to="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
              <DuckIcon size={28} className="logo-icon" />
              <span className="logo-text">ducky</span>
            </Link>

            {/* Desktop nav */}
            <div className="nav-links nav-desktop">
              <Link to="/pricing" className="nav-text-link">
                Pricing
              </Link>
              <Link to="/docs" className="nav-text-link">
                Docs
              </Link>
              {isLoggedIn ? (
                <>
                  <button onClick={handleLogout} className="btn btn-secondary">
                    <LogOut size={15} />
                    Log out
                  </button>
                  <Link to="/dashboard" className="btn btn-primary">
                    <LayoutDashboard size={15} />
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-secondary">
                    Login
                  </Link>
                  <Link to="/signup" className="btn btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out drawer overlay */}
      <div className="nav-overlay" aria-hidden onClick={() => setMenuOpen(false)} />

      {/* Mobile slide-out drawer */}
      <aside className="nav-drawer">
        <div className="nav-drawer-content">
          <Link to="/pricing" className="nav-drawer-item" onClick={() => setMenuOpen(false)}>
            Pricing
          </Link>
          <Link to="/docs" className="nav-drawer-item" onClick={() => setMenuOpen(false)}>
            Docs
          </Link>
          <Link to="/about" className="nav-drawer-item" onClick={() => setMenuOpen(false)}>
            About
          </Link>
          <Link to="/contact" className="nav-drawer-item" onClick={() => setMenuOpen(false)}>
            Contact
          </Link>

          {isOnDocs && (
            <div className="nav-drawer-docs">
              {docsNavItems.map((group) => (
                <div key={group.group} className="nav-drawer-docs-group">
                  <div className="nav-drawer-docs-label">{group.group}</div>
                  {group.items.map((item) => {
                    const active = isDocsLinkActive(item, location.pathname, location.hash);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`nav-drawer-item nav-drawer-docs-item${active ? ' active' : ''}`}
                        onClick={() => setMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          <div className="nav-drawer-actions">
            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="btn btn-primary btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="btn btn-secondary btn-block"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn btn-secondary btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-primary btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </aside>

      {children}

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <Link
                to="/"
                className="logo"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  marginBottom: '12px',
                  display: 'inline-flex',
                }}
              >
                <DuckIcon size={24} className="logo-icon" />
                <span className="logo-text">ducky</span>
              </Link>
              <p>Secure tunnels to localhost</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <Link to="/#features">Features</Link>
              <Link to="/docs">Documentation</Link>
              <Link to="/pricing">Pricing</Link>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <Link to="/about">About</Link>
              <Link to="/contact">Contact</Link>
              <Link to="/terms">Terms</Link>
            </div>
            <div className="footer-section">
              <h4>Developers</h4>
              <Link to="/docs/api">API Reference</Link>
              <Link to="/docs/cli">CLI Docs</Link>
              <a
                href="https://github.com/mjweaver01/ducky"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} ducky. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MarketingLayout;
