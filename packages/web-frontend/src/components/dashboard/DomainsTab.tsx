import React, { useEffect, useRef, useState } from 'react';
import {
  Globe,
  Plus,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  CheckCircle,
  Clock,
  Crown,
} from 'lucide-react';
import type { CustomDomain, User } from '@ducky.wtf/shared';
import { domainsAPI, userAPI } from '../../api';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import LoadingDuck from '../LoadingDuck';
import QuackingDuck from '../QuackingDuckIcon';
import './DomainsTab.css';

const DomainsTab: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const domainsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [domainsData, userData] = await Promise.all([domainsAPI.list(), userAPI.getProfile()]);
      setDomains(domainsData.domains);
      setHasMore(domainsData.hasMore);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDomains = async () => {
    try {
      const data = await domainsAPI.list();
      setDomains(data.domains);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load domains:', error);
    }
  };

  const loadMoreDomains = async () => {
    setLoadingMore(true);
    try {
      const data = await domainsAPI.list(50, domains.length);
      setDomains([...domains, ...data.domains]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more domains:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Infinite scroll
  useInfiniteScroll({
    containerRef: domainsContainerRef,
    hasMore,
    loading: loadingMore || loading,
    onLoadMore: loadMoreDomains,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await domainsAPI.create(newDomain);
      setNewDomain('');
      setShowAdd(false);
      loadDomains();
    } catch (error: any) {
      console.error('Failed to add domain:', error);
      if (error.response?.status === 403) {
        alert('Custom domains require Enterprise plan. Please upgrade to continue.');
      } else {
        alert('Failed to add domain. Please try again.');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      await domainsAPI.verify(id);
      loadDomains();
    } catch (error) {
      console.error('Failed to verify domain:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleRegenerate = async (id: string) => {
    if (!confirm('Regenerate verification token? Your current DNS TXT record will no longer work.'))
      return;
    try {
      await domainsAPI.regenerateToken(id);
      loadDomains();
    } catch (error) {
      console.error('Failed to regenerate token:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;
    try {
      await domainsAPI.delete(id);
      loadDomains();
    } catch (error) {
      console.error('Failed to delete domain:', error);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return <LoadingDuck />;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Custom Domains</h1>
        <p className="page-subtitle">Use your own domain for tunnel URLs</p>
        <div className="page-actions">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn btn-primary"
            disabled={user?.effectivePlan !== 'enterprise'}
            title={user?.effectivePlan !== 'enterprise' ? 'Requires Enterprise plan' : ''}
          >
            <Plus size={16} />
            Add Domain
          </button>
        </div>
      </div>

      {user?.effectivePlan !== 'enterprise' && (
        <div className="card domains-upgrade-banner">
          <div className="domains-upgrade-content">
            <Crown size={24} className="domains-upgrade-icon" />
            <div>
              <h3 className="domains-upgrade-title">Upgrade to Enterprise for Custom Domains</h3>
              <p className="domains-upgrade-text">
                Custom domains are an Enterprise feature. Use your own branded domain (e.g.,
                tunnel.yourcompany.com) instead of subdomains on ducky.wtf.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => (window.location.href = '/pricing?highlight=enterprise')}
              >
                View Enterprise Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdd && user?.effectivePlan === 'enterprise' && (
        <div className="card add-domain-card">
          <h3 className="add-domain-title">Add Custom Domain</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label htmlFor="domainName">Domain Name</label>
              <input
                id="domainName"
                type="text"
                className="input"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="tunnel.yourdomain.com"
                required
                autoFocus
              />
              <small>Enter the subdomain or domain you want to use for tunnels.</small>
            </div>
            <div className="add-domain-actions">
              <button type="submit" className="btn btn-primary" disabled={adding}>
                <Globe size={15} />
                {adding ? 'Adding...' : 'Add Domain'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {domains.length === 0 ? (
          <div className="domains-empty-state">
            <Globe size={48} className="domains-empty-icon" />
            <h3>No custom domains</h3>
            <p>Add your own domain to use professional tunnel URLs.</p>
            {user?.effectivePlan === 'enterprise' && (
              <button
                onClick={() => setShowAdd(true)}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                <Plus size={16} />
                Add Domain
              </button>
            )}
          </div>
        ) : (
          <div ref={domainsContainerRef} style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {domains.map((domain) => {
              const txtName = `_ducky-challenge.${domain.domain}`;
              const txtValue = domain.verificationToken;

              return (
                <div key={domain.id} className="domain-item">
                  <div className="domain-item-row">
                    <div className="domain-item-content">
                      <div className="domain-item-header">
                        {domain.isVerified ? (
                          <CheckCircle size={18} className="domain-item-icon-verified" />
                        ) : (
                          <Clock size={18} className="domain-item-icon-pending" />
                        )}
                        <span className="domain-item-name">{domain.domain}</span>
                        <span
                          className={`badge badge-${domain.isVerified ? 'success' : 'warning'}`}
                        >
                          {domain.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>

                      {domain.isVerified && domain.verifiedAt && (
                        <p className="domain-item-verified-text">
                          Verified on {new Date(domain.verifiedAt).toLocaleDateString()}
                        </p>
                      )}

                      {!domain.isVerified && (
                        <div className="domain-verification">
                          <p className="domain-verification-text">
                            Add this DNS TXT record to verify ownership of your domain:
                          </p>
                          <div className="domain-dns-box">
                            <DnsRow
                              label="Type"
                              value="TXT"
                              copyId={null}
                              copiedId={copiedId}
                              onCopy={handleCopy}
                            />
                            <DnsRow
                              label="Name"
                              value={txtName}
                              copyId={`name-${domain.id}`}
                              copiedId={copiedId}
                              onCopy={handleCopy}
                            />
                            <DnsRow
                              label="Value"
                              value={txtValue}
                              copyId={`value-${domain.id}`}
                              copiedId={copiedId}
                              onCopy={handleCopy}
                              highlight
                            />
                          </div>
                          <p className="domain-dns-note">
                            DNS changes can take up to 48 hours to propagate.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="domain-actions">
                      {!domain.isVerified && (
                        <>
                          <button
                            onClick={() => handleVerify(domain.id)}
                            className="btn btn-primary btn-sm"
                            disabled={verifyingId === domain.id}
                          >
                            {verifyingId === domain.id ? 'Checking…' : 'Verify'}
                          </button>
                          <button
                            onClick={() => handleRegenerate(domain.id)}
                            className="btn btn-secondary btn-sm"
                            title="Regenerate verification token"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(domain.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete domain"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {loadingMore && (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <QuackingDuck size={40} wobble />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface DnsRowProps {
  label: string;
  value: string;
  copyId: string | null;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  highlight?: boolean;
}

const DnsRow: React.FC<DnsRowProps> = ({ label, value, copyId, copiedId, onCopy, highlight }) => (
  <div className="domain-dns-row">
    <span className="domain-dns-label">{label}</span>
    <span className={`domain-dns-value ${highlight ? 'highlight' : ''}`}>{value}</span>
    {copyId && (
      <button
        onClick={() => onCopy(value, copyId)}
        className="btn btn-secondary domain-dns-copy"
        title={`Copy ${label}`}
      >
        {copiedId === copyId ? <Check size={11} /> : <Copy size={11} />}
      </button>
    )}
  </div>
);

export default DomainsTab;
