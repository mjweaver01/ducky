import React, { useEffect, useState } from 'react';
import { domainsAPI, type CustomDomain } from '../api';

const DomainsTab: React.FC = () => {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newDomain, setNewDomain] = useState('');

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
    try {
      await domainsAPI.create(newDomain);
      setNewDomain('');
      setShowAdd(false);
      loadDomains();
    } catch (error) {
      console.error('Failed to add domain:', error);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await domainsAPI.verify(id);
      loadDomains();
    } catch (error) {
      console.error('Failed to verify domain:', error);
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

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Custom Domains</h1>
        <p className="page-subtitle">Use your own domain for tunnel URLs</p>
        <div className="page-actions">
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">
            Add Domain
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>Add Custom Domain</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Domain Name</label>
              <input
                type="text"
                className="input"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="tunnel.example.com"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">Add</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {domains.length === 0 ? (
          <p>No custom domains yet. Add one to get started.</p>
        ) : (
          <div>
            {domains.map((domain) => (
              <div key={domain.id} style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{domain.domain}</div>
                    <div style={{ marginTop: '8px' }}>
                      <span className={`badge badge-${domain.isVerified ? 'success' : 'warning'}`}>
                        {domain.isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                    {!domain.isVerified && (
                      <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--gray)' }}>
                        <p>Add this TXT record to your DNS:</p>
                        <code style={{ display: 'block', marginTop: '8px' }}>
                          _ngrok-challenge.{domain.domain} TXT {domain.verificationToken}
                        </code>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!domain.isVerified && (
                      <button onClick={() => handleVerify(domain.id)} className="btn btn-primary btn-sm">
                        Verify
                      </button>
                    )}
                    <button onClick={() => handleDelete(domain.id)} className="btn btn-danger btn-sm">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DomainsTab;
