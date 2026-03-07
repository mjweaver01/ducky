import React, { useState } from 'react';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import MarketingLayout from '../components/MarketingLayout';
import { useMetadata } from '../hooks/useMetadata';
import { pageMetadata } from '../metadata';
import './PricingPage.css';

const PricingPage: React.FC = () => {
  useMetadata(pageMetadata.pricing);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightEnterprise = searchParams.get('highlight') === 'enterprise';
  const [loading, setLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

  const handleCheckout = async (plan: 'pro' | 'enterprise') => {
    setLoading(plan);
    try {
      const response = await api.post<{ url: string }>('/billing/create-checkout-session', {
        plan,
        interval: billingInterval,
      });
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      const isUnauthorized = (error as any)?.response?.status === 401;
      alert(
        isUnauthorized
          ? 'You must be logged in to purchase a plan. Please log in and try again.'
          : 'Failed to start checkout. Please try again.'
      );
      setLoading(null);
    }
  };

  const getPrice = (planName: string) => {
    if (planName === 'Free') return { price: '$0', period: 'forever' };
    if (planName === 'Pro') {
      return billingInterval === 'month'
        ? { price: '$7', period: '/month' }
        : { price: '$70', period: '/year', savings: 'Save $14' };
    }
    if (planName === 'Enterprise') {
      return billingInterval === 'month'
        ? { price: '$19', period: '/month' }
        : { price: '$190', period: '/year', savings: 'Save $38' };
    }
    return { price: '$0', period: '' };
  };

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for trying out ducky',
      icon: Zap,
      features: [
        'Unlimited tunnels',
        'HTTPS URLs',
        'Dashboard access',
        'Token management',
        'Random URL each time',
      ],
      limitations: ['No static URLs'],
      cta: 'Get Started Free',
      onClick: () => navigate('/signup'),
      popular: false,
    },
    {
      name: 'Pro',
      description: 'For developers and small teams',
      icon: Crown,
      features: [
        'Everything in Free',
        'Static tunnel URLs',
        'Custom subdomains',
        'Regenerate anytime',
        'Perfect for webhooks',
        'Priority support',
      ],
      limitations: [],
      cta: billingInterval === 'month' ? 'Start Pro Monthly' : 'Start Pro Yearly',
      onClick: () => handleCheckout('pro'),
      popular: true,
    },
    {
      name: 'Enterprise',
      description: 'For teams and organizations',
      icon: Building2,
      features: [
        'Everything in Pro',
        'Custom domains',
        'Team management (coming soon)',
        'SLA (under review)',
      ],
      limitations: [],
      cta: billingInterval === 'month' ? 'Start Enterprise Monthly' : 'Start Enterprise Yearly',
      onClick: () => handleCheckout('enterprise'),
      popular: false,
    },
  ];

  return (
    <MarketingLayout>
      <div className="pricing-page">
        <div className="container">
          <div className="pricing-header">
            <h1 className="hero-title">Simple, transparent pricing</h1>
            <p className="pricing-subtitle">Start free, upgrade when you need static URLs</p>

            <div className="billing-toggle">
              <button
                onClick={() => setBillingInterval('month')}
                className={`billing-toggle-btn ${billingInterval === 'month' ? 'active' : ''}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                className={`billing-toggle-btn ${billingInterval === 'year' ? 'active' : ''}`}
              >
                Yearly
                <span className="billing-toggle-badge">-17%</span>
              </button>
            </div>
          </div>

          <div className="pricing-grid">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const pricing = getPrice(plan.name);
              const isProminent =
                (plan.name === 'Enterprise' && highlightEnterprise) ||
                (plan.name === 'Pro' && !highlightEnterprise);
              const badgeLabel =
                plan.name === 'Enterprise' && highlightEnterprise
                  ? 'RECOMMENDED'
                  : plan.name === 'Pro' && !highlightEnterprise
                    ? 'MOST POPULAR'
                    : null;
              return (
                <div
                  key={plan.name}
                  className={`card pricing-card ${isProminent ? 'popular' : ''}`}
                >
                  {badgeLabel && <div className="pricing-card-badge">{badgeLabel}</div>}

                  <div className="pricing-card-header">
                    <div className="pricing-card-title-row">
                      <Icon size={28} className="pricing-card-icon" />
                      <h3 className="pricing-card-title">{plan.name}</h3>
                    </div>
                    <p className="pricing-card-description">{plan.description}</p>
                  </div>

                  <div className="pricing-card-price">
                    <div className="pricing-card-price-row">
                      <span className="pricing-card-price-amount">{pricing.price}</span>
                      <span className="pricing-card-price-period">{pricing.period}</span>
                    </div>
                    {pricing.savings && (
                      <div className="pricing-card-savings">{pricing.savings}</div>
                    )}
                  </div>

                  <button
                    onClick={plan.onClick}
                    disabled={loading === plan.name.toLowerCase()}
                    className={`btn ${isProminent ? 'btn-primary' : 'btn-secondary'} pricing-card-cta`}
                  >
                    {loading === plan.name.toLowerCase() ? 'Loading...' : plan.cta}
                  </button>

                  <div className="pricing-card-features">
                    <ul>
                      {plan.features.map((feature) => (
                        <li key={feature} className="pricing-card-feature-item">
                          <Check size={16} className="pricing-card-feature-icon" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pricing-help-section">
            <h3 className="pricing-help-title hero-title">Questions? We're here to help</h3>
            <p className="pricing-help-text">
              Contact us at support@ducky.wtf or visit our documentation
            </p>
            <div className="pricing-help-actions">
              <button onClick={() => navigate('/contact')} className="btn btn-secondary">
                Contact Sales
              </button>
              <button onClick={() => navigate('/docs')} className="btn btn-secondary">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
};

export default PricingPage;
