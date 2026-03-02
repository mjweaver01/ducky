import React, { useState } from 'react';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import MarketingLayout from '../components/MarketingLayout';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
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
      alert('Failed to start checkout. Please try again.');
      setLoading(null);
    }
  };

  const getPrice = (planName: string) => {
    if (planName === 'Free') return { price: '$0', period: 'forever' };
    if (planName === 'Pro') {
      return billingInterval === 'month'
        ? { price: '$9', period: '/month' }
        : { price: '$90', period: '/year', savings: 'Save $18' };
    }
    if (planName === 'Enterprise') {
      return billingInterval === 'month'
        ? { price: '$49', period: '/month' }
        : { price: '$490', period: '/year', savings: 'Save $98' };
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
        'Team management',
        'SSO (coming soon)',
        'SLA guarantee',
        'Dedicated support',
      ],
      limitations: [],
      cta: billingInterval === 'month' ? 'Start Enterprise Monthly' : 'Start Enterprise Yearly',
      onClick: () => handleCheckout('enterprise'),
      popular: false,
    },
  ];

  return (
    <MarketingLayout>
      <div style={{ minHeight: '100vh', background: 'var(--dark)', padding: '60px 20px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h1 className="hero-title">Simple, transparent pricing</h1>
            <p style={{ fontSize: '20px', color: 'var(--text-muted)', marginBottom: '32px' }}>
              Start free, upgrade when you need static URLs
            </p>

            {/* Billing interval toggle */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--dark-lighter)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '4px',
              }}
            >
              <button
                onClick={() => setBillingInterval('month')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: billingInterval === 'month' ? 'var(--primary)' : 'transparent',
                  color: billingInterval === 'month' ? 'white' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('year')}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: billingInterval === 'year' ? 'var(--primary)' : 'transparent',
                  color: billingInterval === 'year' ? 'white' : 'var(--text-muted)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                Yearly
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'var(--success)',
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                >
                  -17%
                </span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px',
              marginBottom: '60px',
            }}
          >
            {plans.map((plan) => {
              const Icon = plan.icon;
              const pricing = getPrice(plan.name);
              return (
                <div
                  key={plan.name}
                  className="card"
                  style={{
                    position: 'relative',
                    border: plan.popular ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: plan.popular ? 'rgba(var(--primary-rgb), 0.03)' : 'var(--card-bg)',
                  }}
                >
                  {plan.popular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '4px 16px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}

                  <div style={{ marginBottom: '24px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <Icon size={28} style={{ color: 'var(--primary)' }} />
                      <h3 style={{ fontSize: '24px', fontWeight: 600 }}>{plan.name}</h3>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      {plan.description}
                    </p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '48px', fontWeight: 700, color: 'var(--text)' }}>
                        {pricing.price}
                      </span>
                      <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
                        {pricing.period}
                      </span>
                    </div>
                    {pricing.savings && (
                      <div
                        style={{
                          marginTop: '8px',
                          fontSize: '13px',
                          color: 'var(--success)',
                          fontWeight: 600,
                        }}
                      >
                        {pricing.savings}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={plan.onClick}
                    disabled={loading === plan.name.toLowerCase()}
                    className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ width: '100%', marginBottom: '24px' }}
                  >
                    {loading === plan.name.toLowerCase() ? 'Loading...' : plan.cta}
                  </button>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                            fontSize: '14px',
                          }}
                        >
                          <Check size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '24px', marginBottom: '16px' }}>
              Questions? We're here to help
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              Contact us at support@ducky.wtf or visit our documentation
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
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
