import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Heart } from 'lucide-react';
import MarketingLayout from '../components/MarketingLayout';
import './MarketingPages.css';

const values = [
  {
    icon: <Zap size={28} />,
    title: 'Speed first',
    body: 'Every millisecond matters in a development loop. We obsess over latency so your tunnels feel invisible.',
  },
  {
    icon: <Shield size={28} />,
    title: 'Security by default',
    body: 'HTTPS everywhere, rate limiting, and DDoS protection are on by default — not add-ons.',
  },
  {
    icon: <Heart size={28} />,
    title: 'Built for developers',
    body: 'We build the tools we wish existed. Every feature comes from a real developer pain point.',
  },
];

const AboutPage: React.FC = () => {
  return (
    <MarketingLayout>
      <section className="marketing-hero">
        <div className="container">
          <div className="marketing-hero-content">
            <h1 className="marketing-hero-title">Building for the people who build the internet</h1>
            <p className="marketing-hero-subtitle">
              ducky started as a weekend project to solve a simple problem: sharing a local server
              with a teammate shouldn't require a deployment.
            </p>
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="prose-section">
            <h2>Our story</h2>
            <p>
              Every developer has been there — you've built something locally, it works perfectly on
              your machine, and now you need to show it to someone else. Or a third-party webhook
              needs to reach your development server. Or you're demoing to a client from a coffee
              shop.
            </p>
            <p>
              The workarounds were clunky: deploy to a staging server, fiddle with port forwarding,
              or pay for a VPN just to share a URL. ducky was built to make that entire class of
              problem disappear. One command, one URL, done.
            </p>
            <p>
              We're a small team of developers who use ducky ourselves every single day. That keeps
              us honest — every bug we ship, we feel. Every performance win, we celebrate.
            </p>
          </div>
        </div>
      </section>

      <section
        className="marketing-section"
        style={{
          background: 'var(--dark-card)',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="container">
          <h2 className="section-title">What we stand for</h2>
          <div className="values-grid">
            {values.map((v) => (
              <div key={v.title} className="value-card">
                <div className="value-icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-section">
        <div className="container">
          <div className="prose-section">
            <h2>Open and honest</h2>
            <p>
              We believe in transparency. Our pricing is straightforward — no surprise bills, no
              features gated behind obscure tiers. If something breaks, we tell you what happened
              and what we're doing to fix it.
            </p>
            <p>
              We're also believers in the open web. ducky speaks standard HTTP and WebSockets. It
              works with any framework, any language, any stack. No lock-in.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Want to work with us?</h2>
            <p>We're always looking for people who care deeply about developer tools.</p>
            <Link to="/contact" className="btn btn-primary btn-large">
              Get in Touch
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default AboutPage;
