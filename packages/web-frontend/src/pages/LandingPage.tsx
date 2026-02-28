import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing">
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <span className="logo-icon">🦆</span>
              <span className="logo-text">ducky</span>
            </div>
            <div className="nav-links">
              <Link to="/login" className="btn btn-secondary">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Expose your local server to the internet
            </h1>
            <p className="hero-subtitle">
              Secure tunnels to localhost. Perfect for webhooks, demos, and development.
              Share your local server with a public URL in seconds.
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn btn-primary btn-large">
                Start for Free
              </Link>
              <a href="#features" className="btn btn-secondary btn-large">
                Learn More
              </a>
            </div>

            <div className="code-demo">
              <div className="code-header">
                <span className="code-dot"></span>
                <span className="code-dot"></span>
                <span className="code-dot"></span>
              </div>
              <pre className="code-content">
                <code>
{`$ npm install -g ducky
$ ducky http 3000

✓ Tunnel established
  https://abc123.ducky.dev → http://localhost:3000`}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Built for developers</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🚀</div>
              <h3>Instant Setup</h3>
              <p>Get a public URL in seconds. No configuration required.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure by Default</h3>
              <p>HTTPS automatically. Rate limiting and DDoS protection built-in.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>WebSocket tunnels for real-time, low-latency connections.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics</h3>
              <p>Track requests, bandwidth, and performance in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Custom Domains</h3>
              <p>Use your own domain for professional tunnel URLs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔧</div>
              <h3>Developer Friendly</h3>
              <p>Simple CLI, REST API, and beautiful web dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to get started?</h2>
            <p>Create your free account and start tunneling in minutes.</p>
            <Link to="/signup" className="btn btn-primary btn-large">
              Sign Up Now
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="logo">
                <span className="logo-icon">🦆</span>
                <span className="logo-text">ducky</span>
              </div>
              <p>Secure tunnels to localhost</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="/docs">Documentation</a>
              <a href="/pricing">Pricing</a>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
              <a href="/terms">Terms</a>
            </div>
            <div className="footer-section">
              <h4>Developers</h4>
              <a href="/docs/api">API Reference</a>
              <a href="/docs/cli">CLI Docs</a>
              <a href="https://github.com">GitHub</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 ducky. Built with TypeScript & AWS.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
