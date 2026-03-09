import React, { useState } from 'react';
import { CreditCard, Crown, Zap, Building2 } from 'lucide-react';
import type { User as UserType } from '@ducky.wtf/shared';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import './SettingsTab.css';

interface SubscriptionTabProps {
  user: UserType | null;
}

const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ user }) => {
  const [billingLoading, setBillingLoading] = useState(false);

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const response = await api.post<{ url: string }>('/billing/create-portal-session');
      window.location.href = response.data.url;
    } catch (err: any) {
      alert('Failed to open billing portal. Please try again.');
      setBillingLoading(false);
    }
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
        return 'rgb(234, 179, 8)';
      case 'enterprise':
        return 'rgb(147, 51, 234)';
      default:
        return 'rgb(59, 130, 246)';
    }
  };

  const getPlanDisplay = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'Pro Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      default:
        return 'Free Plan';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Subscription</h1>
        <p className="page-subtitle">Manage your plan and billing</p>
      </div>

      <div className="settings-grid">
        <div className="card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="settings-card-title">Current Plan</h2>
              <p className="settings-card-subtitle">Your active subscription details</p>
            </div>
          </div>

          <div className="plan-badge">
            {React.createElement(getPlanIcon(user?.plan || 'free'), {
              size: 24,
              style: { color: getPlanColor(user?.plan || 'free') },
            })}
            <div className="plan-badge-content">
              <div className="plan-badge-title">{getPlanDisplay(user?.plan || 'free')}</div>
              {user?.plan === 'free' ? (
                <div className="plan-badge-subtitle">
                  Upgrade to unlock static URLs and custom domains
                </div>
              ) : (
                <div className="plan-badge-subtitle">
                  {user?.planExpiresAt &&
                    `Renews on ${new Date(user.planExpiresAt).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>

          <div className="settings-actions">
            {user?.plan === 'free' ? (
              <Link to="/pricing" className="btn btn-primary">
                <Crown size={16} />
                Upgrade Plan
              </Link>
            ) : (
              <button
                onClick={handleManageBilling}
                className="btn btn-secondary"
                disabled={billingLoading}
              >
                {billingLoading ? 'Loading…' : 'Manage Billing'}
              </button>
            )}
            {user?.plan !== 'free' && (
              <Link to="/pricing" className="btn btn-secondary">
                View Plans
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionTab;
