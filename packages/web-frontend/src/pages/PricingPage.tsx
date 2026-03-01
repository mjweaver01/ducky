import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight, Clock } from 'lucide-react';
import MarketingLayout from '../components/MarketingLayout';
import './MarketingPages.css';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started. No credit card required.',
    cta: 'Get Started',
    ctaTo: '/signup',
    available: true,
    highlight: true,
    features: [
      '1 active tunnel at a time',
      'Shared subdomains (*.ducky.wtf)',
      '100 requests / minute',
      '1 GB data transfer / month',
      'HTTPS by default',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: '$9',
    period: 'per month',
    description: 'More tunnels, custom domains, and higher limits.',
    available: false,
    highlight: false,
    features: [
      'Unlimited active tunnels',
      'Custom domains',
      '1,000 requests / minute',
      '50 GB data transfer / month',
      'Request inspector & replay',
      'Real-time analytics dashboard',
      'Priority email support',
    ],
  },
  {
    name: 'Business',
    price: '$29',
    period: 'per month',
    description: 'Team access, audit logs, and SLA guarantees.',
    available: false,
    highlight: false,
    features: [
      'Everything in Pro',
      'Team member access',
      'Unlimited rate limits',
      'Unlimited data transfer',
      'Custom rate-limit rules',
      'Audit logs',
      '99.9% uptime SLA',
      'Dedicated support channel',
    ],
  },
];

const faqs = [
  {
    q: 'Is ducky really free?',
    a: 'Yes — the Free plan has no time limit and requires no credit card. You can run one tunnel at a time on shared ducky.wtf subdomains indefinitely.',
  },
  {
    q: 'When will paid plans be available?',
    a: "We're actively working on Pro and Business plans. Sign up for the Free plan and we'll notify you when they launch.",
  },
  {
    q: 'What counts as a "request"?',
    a: 'Every HTTP request forwarded through your tunnel counts as one request. WebSocket connections count as one request for the initial handshake.',
  },
  {
    q: 'Can I get notified when paid plans launch?',
    a: "Yes — sign up for a free account and we'll email you when Pro and Business plans become available.",
  },
];

const PricingPage: React.FC = () => {
  return (
    <MarketingLayout>
      <section className="marketing-hero">
        <div className="container">
          <div className="marketing-hero-content">
            <h1 className="marketing-hero-title">Simple, transparent pricing</h1>
            <p className="marketing-hero-subtitle">
              Free to start. Paid plans with more power are coming soon.
            </p>
          </div>
        </div>
      </section>

      <section className="pricing-section">
        <div className="container">
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card${plan.highlight ? ' pricing-card-highlight' : ''}${!plan.available ? ' pricing-card-unavailable' : ''}`}
              >
                {!plan.available && (
                  <div className="pricing-badge pricing-badge-soon">
                    <Clock size={11} />
                    Coming Soon
                  </div>
                )}

                <div className="pricing-header">
                  <h3 className="pricing-name">{plan.name}</h3>
                  <div className="pricing-price">
                    <span
                      className={`pricing-amount${!plan.available ? ' pricing-amount-muted' : ''}`}
                    >
                      {plan.price}
                    </span>
                    <span className="pricing-period">/{plan.period}</span>
                  </div>
                  <p className="pricing-description">{plan.description}</p>
                </div>

                {plan.available ? (
                  <Link
                    to={plan.ctaTo!}
                    className="btn btn-primary btn-block"
                    style={{ marginBottom: '28px' }}
                  >
                    {plan.cta}
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    disabled
                    className="btn btn-secondary btn-block"
                    style={{ marginBottom: '28px', opacity: 0.45, cursor: 'not-allowed' }}
                  >
                    Not yet available
                  </button>
                )}

                <ul className="pricing-features">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className={`pricing-feature${!plan.available ? ' pricing-feature-muted' : ''}`}
                    >
                      <Check
                        size={15}
                        className={`pricing-check${!plan.available ? ' pricing-check-muted' : ''}`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section">
        <div className="container">
          <h2 className="section-title">Frequently asked questions</h2>
          <div className="faq-grid">
            {faqs.map((faq) => (
              <div key={faq.q} className="faq-item">
                <h4 className="faq-question">{faq.q}</h4>
                <p className="faq-answer">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Start tunneling for free</h2>
            <p>No credit card. No time limit. Just sign up and go.</p>
            <Link to="/signup" className="btn btn-primary btn-large">
              Get Started for Free
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default PricingPage;
