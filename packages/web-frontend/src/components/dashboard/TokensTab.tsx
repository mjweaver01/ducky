import React, { useEffect, useRef, useState } from 'react';
import { Key, Copy, Check, Plus, Trash2, Crown, RefreshCw, Edit2, X } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Token, User } from '@ducky.wtf/shared';
import { tokensAPI, userAPI } from '../../api';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import LoadingDuck from '../LoadingDuck';
import './TokensTab.css';

const TokensTab: React.FC = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState<Token | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingSubdomainId, setEditingSubdomainId] = useState<string | null>(null);
  const [customSubdomain, setCustomSubdomain] = useState('');
  const [subdomainError, setSubdomainError] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tokens.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tokensData, userData] = await Promise.all([tokensAPI.list(), userAPI.getProfile()]);
      setTokens(tokensData.tokens);
      setHasMore(tokensData.hasMore);
      setUser(userData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTokens = async () => {
    try {
      const data = await tokensAPI.list();
      setTokens(data.tokens);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  };

  const loadMoreTokens = async () => {
    setLoadingMore(true);
    try {
      const data = await tokensAPI.list(50, tokens.length);
      setTokens([...tokens, ...data.tokens]);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Failed to load more tokens:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Infinite scroll
  useInfiniteScroll({
    containerRef: tableContainerRef,
    hasMore,
    loading: loadingMore || loading,
    onLoadMore: loadMoreTokens,
  });

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

  const handleEditSubdomain = (token: Token) => {
    setEditingSubdomainId(token.id);
    setCustomSubdomain(token.subdomain || '');
    setSubdomainError('');
  };

  const handleSaveSubdomain = async (tokenId: string) => {
    if (!customSubdomain.trim()) {
      setSubdomainError('Subdomain cannot be empty');
      return;
    }

    if (!/^[a-z0-9]{3,20}$/.test(customSubdomain)) {
      setSubdomainError('Must be 3-20 characters (lowercase letters and numbers only)');
      return;
    }

    try {
      await tokensAPI.updateSubdomain(tokenId, customSubdomain);
      setEditingSubdomainId(null);
      setCustomSubdomain('');
      setSubdomainError('');
      loadTokens();
    } catch (error: any) {
      setSubdomainError(error.response?.data?.error || 'Failed to update subdomain');
    }
  };

  const handleCancelEditSubdomain = () => {
    setEditingSubdomainId(null);
    setCustomSubdomain('');
    setSubdomainError('');
  };

  const handleRegenerateSubdomain = async (tokenId: string) => {
    if (!confirm('Regenerate subdomain? Your current URL will change.')) return;
    try {
      await tokensAPI.regenerateSubdomain(tokenId);
      loadTokens();
    } catch (error) {
      console.error('Failed to regenerate subdomain:', error);
    }
  };

  if (loading) {
    return <LoadingDuck />;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Auth Tokens</h1>
        <p className="page-subtitle">Manage API tokens for CLI authentication</p>
        <div className="page-actions">
          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setCreatedToken(null);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Create Token
          </button>
        </div>
      </div>

      {user?.effectivePlan === 'free' && (
        <div className="card upgrade-banner">
          <div className="upgrade-banner-content">
            <Crown size={24} className="upgrade-banner-icon" />
            <div>
              <h3 className="upgrade-banner-title">Upgrade to Pro for Static URLs</h3>
              <p className="upgrade-banner-text">
                Free accounts get a new random URL each time you start the CLI. Upgrade to Pro or
                Enterprise to get a permanent static URL that never changes.
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => (window.location.href = '/pricing?highlight=enterprise')}
              >
                View Pricing
              </button>
            </div>
          </div>
        </div>
      )}

      {createdToken && (
        <div className="card token-created-banner">
          <div className="token-created-header">
            <div>
              <div className="token-created-title-row">
                <Check size={18} className="token-created-icon" />
                <h3 className="token-created-title">Token created: {createdToken.name}</h3>
              </div>
              <p className="token-created-text">
                Copy your token now — it won't be shown again after you dismiss this.
              </p>
            </div>
            <button
              onClick={() => setCreatedToken(null)}
              className="btn btn-secondary btn-sm token-created-dismiss"
            >
              Dismiss
            </button>
          </div>
          <div className="token-display">
            <div className="token-display-code">{createdToken.token}</div>
            <button
              onClick={() => handleCopy(createdToken.token, 'created')}
              className={`btn ${copiedId === 'created' ? 'btn-primary' : 'btn-secondary'} token-display-copy`}
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
        <div className="card create-token-card">
          <h3 className="create-token-title">Create New Token</h3>
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
            <div className="create-token-actions">
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
            <Key size={48} className="tokens-empty-icon" />
            <h3>No tokens yet</h3>
            <p>Create an auth token to authenticate the ducky CLI.</p>
            <button
              onClick={() => {
                setShowCreate(true);
                setCreatedToken(null);
              }}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              <Plus size={16} />
              Create Token
            </button>
          </div>
        ) : (
          <div ref={tableContainerRef} className="tokens-table-wrapper tokens-table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Token</th>
                  <th>Static URL</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rowVirtualizer.getVirtualItems().length > 0 &&
                  rowVirtualizer.getVirtualItems()[0].start > 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          height: rowVirtualizer.getVirtualItems()[0].start,
                          padding: 0,
                          border: 0,
                        }}
                      />
                    </tr>
                  )}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const token = tokens[virtualRow.index];
                  return (
                    <tr key={token.id} data-index={virtualRow.index}>
                      <td>
                        <strong>{token.name}</strong>
                      </td>
                      <td>
                        <div className="token-table-actions">
                          <span className="token-table-code">{token.token.slice(0, 24)}…</span>
                          <button
                            onClick={() => handleCopy(token.token, token.id)}
                            className="btn btn-secondary token-table-btn-sm"
                            title="Copy full token"
                          >
                            {copiedId === token.id ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        {token.subdomain ? (
                          <div>
                            {editingSubdomainId === token.id ? (
                              <div>
                                <div className="token-table-subdomain-row">
                                  <input
                                    type="text"
                                    className="input token-subdomain-input"
                                    value={customSubdomain}
                                    onChange={(e) =>
                                      setCustomSubdomain(e.target.value.toLowerCase())
                                    }
                                    placeholder="myapp"
                                    autoFocus
                                  />
                                  <span className="token-subdomain-suffix">.ducky.wtf</span>
                                  <button
                                    onClick={() => handleSaveSubdomain(token.id)}
                                    className="btn btn-primary token-subdomain-btn"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={handleCancelEditSubdomain}
                                    className="btn btn-secondary token-subdomain-btn"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                                {subdomainError && (
                                  <p className="token-subdomain-error">{subdomainError}</p>
                                )}
                              </div>
                            ) : (
                              <div className="token-subdomain-display">
                                <span className="token-subdomain-url">
                                  https://{token.subdomain}.ducky.wtf
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopy(
                                      `https://${token.subdomain}.ducky.wtf`,
                                      `url-${token.id}`
                                    )
                                  }
                                  className="btn btn-secondary token-table-btn-sm"
                                  title="Copy URL"
                                >
                                  {copiedId === `url-${token.id}` ? (
                                    <Check size={12} />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleEditSubdomain(token)}
                                  className="btn btn-secondary token-table-btn-sm"
                                  title="Customize subdomain"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleRegenerateSubdomain(token.id)}
                                  className="btn btn-secondary token-table-btn-sm"
                                  title="Regenerate subdomain"
                                >
                                  <RefreshCw size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        ) : user?.effectivePlan !== 'free' ? (
                          <div className="token-random-url">
                            <span className="token-random-url-text">No static URL yet</span>
                            <button
                              onClick={() => handleRegenerateSubdomain(token.id)}
                              className="btn btn-primary btn-sm"
                              style={{ marginLeft: '8px' }}
                              title="Add static URL to this token"
                            >
                              <Plus size={12} />
                              Add Static URL
                            </button>
                          </div>
                        ) : (
                          <div className="token-random-url">
                            <span className="token-random-url-text">Random URL each time</span>
                            <Crown
                              size={14}
                              className="token-random-url-icon"
                              aria-label="Upgrade to Pro for static URLs"
                            />
                          </div>
                        )}
                      </td>
                      <td className="token-table-date">
                        {new Date(token.createdAt).toLocaleDateString()}
                      </td>
                      <td className="token-table-date-value">
                        {token.lastUsedAt ? (
                          new Date(token.lastUsedAt).toLocaleDateString()
                        ) : (
                          <span className="token-table-date-never">Never</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleRevoke(token.id)}
                          className="btn btn-danger btn-sm token-revoke-btn"
                        >
                          <Trash2 size={13} />
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const items = rowVirtualizer.getVirtualItems();
                  const paddingBottom =
                    items.length > 0
                      ? rowVirtualizer.getTotalSize() - items[items.length - 1].end
                      : 0;
                  return paddingBottom > 0 ? (
                    <tr>
                      <td colSpan={6} style={{ height: paddingBottom, padding: 0, border: 0 }} />
                    </tr>
                  ) : null;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TokensTab;
