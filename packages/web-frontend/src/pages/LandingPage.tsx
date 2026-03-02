import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Gauge, BarChart3, Globe, Wrench, LayoutDashboard } from 'lucide-react';
import DuckIcon from '../components/DuckIcon';
import QuackingDuck from '../components/QuackingDuckIcon';
import MarketingLayout from '../components/MarketingLayout';
import { useMetadata } from '../hooks/useMetadata';
import { authAPI } from '../api';
import { pageMetadata } from '../metadata';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  useMetadata(pageMetadata.home);
  const isAuthenticated = authAPI.isAuthenticated();

  return (
    <MarketingLayout>
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-icon">
              <QuackingDuck size={180} wobble autoQuack className="hero-duck" />
            </div>
            <h1 className="hero-title">Expose your local server to the internet</h1>
            <p className="hero-subtitle">
              Secure tunnels to localhost. Perfect for webhooks, demos, and development. Share your
              local server with a public URL in seconds.
            </p>
            <div className="hero-cta">
              <Link to="/signup" className="btn btn-primary btn-large">
                {isAuthenticated ? 'Go to Dashboard' : 'Start for Free'}
                <ArrowRight size={20} />
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
                  {'$ npm install -g '}
                  <span className="code-primary">ducky</span>
                  {'\n$ '}
                  <span className="code-primary">ducky</span>
                  {' http 3000\n\n'}✓ Tunnel established
                  {'\n  https://abc123.'}
                  <span className="code-primary">ducky.wtf</span>
                  {' → http://localhost:3000'}
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
              <div className="feature-icon">
                <Gauge size={32} />
              </div>
              <h3>Instant Setup</h3>
              <p>Get a public URL in seconds. No configuration required.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={32} />
              </div>
              <h3>Secure by Default</h3>
              <p>HTTPS automatically. Rate limiting and DDoS protection built-in.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <DuckIcon size={32} />
              </div>
              <h3>Lightning Fast</h3>
              <p>WebSocket tunnels for real-time, low-latency connections.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <BarChart3 size={32} />
              </div>
              <h3>Analytics</h3>
              <p>Track requests, bandwidth, and performance in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Globe size={32} />
              </div>
              <h3>Custom Domains</h3>
              <p>Use your own domain for professional tunnel URLs.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <Wrench size={32} />
              </div>
              <h3>Developer Friendly</h3>
              <p>Simple CLI, REST API, and beautiful web dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            {isAuthenticated ? (
              <>
                <h2>Get started!</h2>
                <p>Go to your dashboard to start tunneling in seconds.</p>
                <Link to="/dashboard" className="btn btn-primary btn-large">
                  Go to Dashboard
                  <ArrowRight size={20} />
                </Link>
              </>
            ) : (
              <>
                <h2>Ready to get started?</h2>
                <p>Create your free account and start tunneling in seconds.</p>
                <Link to="/login" className="btn btn-primary btn-large">
                  Login Now
                  <ArrowRight size={20} />
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default LandingPage;
