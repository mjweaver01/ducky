import React, { useEffect, useState } from 'react';
import { tokensAPI, type Token } from '../api';

const TokensTab: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');

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
    try {
      await tokensAPI.create(newTokenName);
      setNewTokenName('');
      setShowCreate(false);
      loadTokens();
    } catch (error) {
      console.error('Failed to create token:', error);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this token?')) return;
    try {
      await tokensAPI.revoke(id);
      loadTokens();
    } catch (error) {
      console.error('Failed to revoke token:', error);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Auth Tokens</h1>
        <p className="page-subtitle">Manage API tokens for CLI authentication</p>
        <div className="page-actions">
          <button onClick={() => setShowCreate(true)} className="btn btn-primary">
            Create Token
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3>Create New Token</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Token Name</label>
              <input
                type="text"
                className="input"
                value={newTokenName}
                onChange={(e) => setNewTokenName(e.target.value)}
                placeholder="e.g., My Laptop"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {tokens.length === 0 ? (
          <p>No tokens yet. Create one to get started.</p>
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
                  <td>{token.name}</td>
                  <td><code>{token.token}</code></td>
                  <td>{new Date(token.createdAt).toLocaleDateString()}</td>
                  <td>{token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <button onClick={() => handleRevoke(token.id)} className="btn btn-danger btn-sm">
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
