import React, { useEffect, useState } from 'react';
import { Key, Copy, Check, Plus, Trash2 } from 'lucide-react';
import { tokensAPI, type Token } from '../api';
import QuackingDuck from './QuackingDuckIcon';

const TokensTab: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<Token | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      const data = await tokensAPI.list();
      setTokens(data);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const token = await tokensAPI.create(newTokenName);
      setCreatedToken(token);
      setNewTokenName('');
      setShowCreate(false);
      loadTokens();
    } catch (error) {
      console.error('Failed to create token:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke this token? Any CLI sessions using it will be disconnected.'
      )
    )
      return;
    try {
      await tokensAPI.revoke(id);
      if (createdToken?.id === id) setCreatedToken(null);
      loadTokens();
    } catch (error) {
      console.error('Failed to revoke token:', error);
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
        <QuackingDuck size={75} wobble autoQuack />
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Auth Tokens</h1>
        <p className="page-subtitle">Manage API tokens for CLI authentication</p>
        <div className="page-actions">
          <button
            onClick={() => {
              setShowCreate(true);
              setCreatedToken(null);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Token
          </button>
        </div>
      </div>

      {createdToken && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            borderColor: 'rgba(16, 185, 129, 0.5)',
            background: 'rgba(16, 185, 129, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}
          >
            <div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}
              >
                <Check size={18} style={{ color: 'var(--success)' }} />
                <h3 style={{ color: 'var(--success)' }}>Token created: {createdToken.name}</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Copy your token now — it won't be shown again after you dismiss this.
              </p>
            </div>
            <button
              onClick={() => setCreatedToken(null)}
              className="btn btn-secondary btn-sm"
              style={{ flexShrink: 0 }}
            >
              Dismiss
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div
              style={{
                flex: 1,
                background: 'var(--dark)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: "'Monaco', 'Courier New', monospace",
                fontSize: '13px',
                wordBreak: 'break-all',
                color: 'var(--text)',
                lineHeight: 1.5,
              }}
            >
              {createdToken.token}
            </div>
            <button
              onClick={() => handleCopy(createdToken.token, 'created')}
              className={`btn ${copiedId === 'created' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flexShrink: 0, minWidth: '90px' }}
            >
              {copiedId === 'created' ? (
                <>
                  <Check size={15} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={15} /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Create New Token</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="tokenName">Token Name</label>
              <input
                id="tokenName"
                type="text"
                className="input"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g., My Laptop, Work MacBook"
                required
                autoFocus
              />
              <small>Give it a recognizable name so you know where it's used.</small>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                <Key size={15} />
                {creating ? 'Creating...' : 'Create Token'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {tokens.length === 0 ? (
          <div className="empty-state">
            <Key size={48} style={{ color: 'var(--gray-dark)', marginBottom: '16px' }} />
            <h3>No tokens yet</h3>
            <p>Create an auth token to authenticate the ducky CLI.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Token</th>
                <th>Created</th>
                <th>Last Used</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token) => (
                <tr key={token.id}>
                  <td>
                    <strong>{token.name}</strong>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: "'Monaco', 'Courier New', monospace",
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {token.token.slice(0, 24)}…
                      </span>
                      <button
                        onClick={() => handleCopy(token.token, token.id)}
                        className="btn btn-secondary"
                        style={{ padding: '3px 8px', fontSize: '12px' }}
                        title="Copy full token"
                      >
                        {copiedId === token.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(token.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ fontSize: '13px' }}>
                    {token.lastUsedAt ? (
                      new Date(token.lastUsedAt).toLocaleDateString()
                    ) : (
                      <span style={{ color: 'var(--gray-dark)' }}>Never</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleRevoke(token.id)}
                      className="btn btn-danger btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={13} />
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TokensTab;
