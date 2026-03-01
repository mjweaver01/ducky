import React, { useEffect, useState } from 'react';
import { Globe, Plus, Copy, Check, RefreshCw, Trash2, CheckCircle, Clock } from 'lucide-react';
import { domainsAPI, type CustomDomain } from '../api';
import QuackingDuck from './QuackingDuckIcon';

const DomainsTab: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    loadDomains();
  }, []);

  const loadDomains = async () => {
    try {
      const data = await domainsAPI.list();
      setDomains(data);
    } catch (error) {
      console.error('Failed to load domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      await domainsAPI.create(newDomain);
      setNewDomain('');
      setShowAdd(false);
      loadDomains();
    } catch (error) {
      console.error('Failed to add domain:', error);
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

  if (loading)
    return (
      <div className="loading">
        <QuackingDuck size={100} wobble autoQuack />
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Custom Domains</h1>
        <p className="page-subtitle">Use your own domain for tunnel URLs</p>
        <div className="page-actions">
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            <Plus size={16} />
            Add Domain
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Add Custom Domain</h3>
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
            <div style={{ display: 'flex', gap: '12px' }}>
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
          <div className="empty-state">
            <Globe size={48} style={{ color: 'var(--gray-dark)', marginBottom: '16px' }} />
            <h3>No custom domains</h3>
            <p>Add your own domain to use professional tunnel URLs.</p>
          </div>
        ) : (
          <div>
            {domains.map((domain, i) => {
              const txtName = `_ducky-challenge.${domain.domain}`;
              const txtValue = domain.verificationToken;
              const isLast = i === domains.length - 1;

              return (
                <div
                  key={domain.id}
                  style={{
                    padding: '20px 0',
                    borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '16px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '6px',
                        }}
                      >
                        {domain.isVerified ? (
                          <CheckCircle
                            size={18}
                            style={{ color: 'var(--success)', flexShrink: 0 }}
                          />
                        ) : (
                          <Clock size={18} style={{ color: 'var(--warning)', flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: '17px', fontWeight: 600 }}>{domain.domain}</span>
                        <span
                          className={`badge badge-${domain.isVerified ? 'success' : 'warning'}`}
                        >
                          {domain.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>

                      {domain.isVerified && domain.verifiedAt && (
                        <p
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-muted)',
                            marginLeft: '28px',
                          }}
                        >
                          Verified on {new Date(domain.verifiedAt).toLocaleDateString()}
                        </p>
                      )}

                      {!domain.isVerified && (
                        <div style={{ marginTop: '14px', marginLeft: '28px' }}>
                          <p
                            style={{
                              fontSize: '13px',
                              color: 'var(--text-muted)',
                              marginBottom: '10px',
                            }}
                          >
                            Add this DNS TXT record to verify ownership of your domain:
                          </p>
                          <div
                            style={{
                              background: 'var(--dark)',
                              border: '1px solid var(--border)',
                              borderRadius: '8px',
                              padding: '14px 16px',
                            }}
                          >
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
                          <p
                            style={{
                              fontSize: '12px',
                              color: 'var(--gray-dark)',
                              marginTop: '8px',
                            }}
                          >
                            DNS changes can take up to 48 hours to propagate.
                          </p>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        flexShrink: 0,
                        alignItems: 'flex-start',
                      }}
                    >
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
  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px 0' }}>
    <span
      style={{
        width: '48px',
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--gray-dark)',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
    <span
      style={{
        flex: 1,
        fontFamily: "'Monaco', 'Courier New', monospace",
        fontSize: '12px',
        wordBreak: 'break-all',
        color: highlight ? 'var(--primary)' : 'var(--text)',
      }}
    >
      {value}
    </span>
    {copyId && (
      <button
        onClick={() => onCopy(value, copyId)}
        className="btn btn-secondary"
        style={{ padding: '3px 8px', fontSize: '11px', flexShrink: 0 }}
        title={`Copy ${label}`}
      >
        {copiedId === copyId ? <Check size={11} /> : <Copy size={11} />}
      </button>
    )}
  </div>
);

export default DomainsTab;
