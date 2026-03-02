import React, { useEffect, useState } from 'react';
import {
  Activity,
  Wifi,
  BarChart3,
  Database,
  Copy,
  Check,
  Square,
  ExternalLink,
} from 'lucide-react';
import { tunnelsAPI, type Tunnel, type TunnelStats } from '../api';
import QuackingDuck from './QuackingDuckIcon';

const TUNNEL_DOMAIN = 'ducky.wtf';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getTunnelUrl(subdomain: string): string {
  return `https://${subdomain}.${TUNNEL_DOMAIN}`;
}

const TunnelsTab: React.FC = () => {
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [stats, setStats] = useState<TunnelStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [tunnelsData, statsData] = await Promise.all([
        tunnelsAPI.list(),
        tunnelsAPI.getStats(),
      ]);
      setTunnels(tunnelsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load tunnels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id: string) => {
    try {
      await tunnelsAPI.stop(id);
      loadData();
    } catch (error) {
      console.error('Failed to stop tunnel:', error);
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
        <h1 className="page-title">Tunnels</h1>
        <p className="page-subtitle">Monitor your active and historical tunnels</p>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="card stat-card">
            <div className="stat-icon stat-icon-primary">
              <Activity size={20} />
            </div>
            <div className="stat-value" style={{ color: 'var(--primary)' }}>
              {stats.activeTunnels}
            </div>
            <div className="stat-label">Active Tunnels</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon-success">
              <Wifi size={20} />
            </div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>
              {stats.totalTunnels}
            </div>
            <div className="stat-label">Total Tunnels</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon-secondary">
              <BarChart3 size={20} />
            </div>
            <div className="stat-value" style={{ color: 'var(--secondary)' }}>
              {stats.totalRequests.toLocaleString()}
            </div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon-warning">
              <Database size={20} />
            </div>
            <div className="stat-value" style={{ color: 'var(--warning)' }}>
              {formatBytes(stats.totalBytes)}
            </div>
            <div className="stat-label">Data Transferred</div>
          </div>
        </div>
      )}

      <div className="card">
        {tunnels.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} style={{ color: 'var(--gray-dark)', marginBottom: '16px' }} />
            <h3>No tunnels yet</h3>
            <p>Start a tunnel using the CLI to expose your local server.</p>
            <div
              className="code-demo"
              style={{
                marginTop: '24px',
                maxWidth: '520px',
                margin: '24px auto 0',
                textAlign: 'left',
              }}
            >
              <div className="code-header">
                <span className="code-dot"></span>
                <span className="code-dot"></span>
                <span className="code-dot"></span>
              </div>
              <pre className="code-content">
                <code>
                  {'$ '}
                  <span className="code-primary">ducky</span>
                  {' config auth YOUR_TOKEN\n$ '}
                  <span className="code-primary">ducky</span>
                  {' http 3000\n\n✓ Tunnel established\n  https://abc123.'}
                  <span className="code-primary">ducky.wtf</span>
                  {' → localhost:3000'}
                </code>
              </pre>
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tunnel URL</th>
                <th>Port</th>
                <th>Status</th>
                <th>Requests</th>
                <th>Data</th>
                <th>Connected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tunnels.map((tunnel) => {
                const url = getTunnelUrl(tunnel.subdomain);
                const copyId = `url-${tunnel.id}`;
                return (
                  <tr key={tunnel.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {url}
                          <ExternalLink size={12} style={{ flexShrink: 0 }} />
                        </a>
                        <button
                          onClick={() => handleCopy(url, copyId)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="Copy URL"
                        >
                          {copiedId === copyId ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td>{tunnel.localPort}</td>
                    <td>
                      <span
                        className={`badge badge-${tunnel.status === 'active' ? 'success' : 'warning'}`}
                      >
                        {tunnel.status}
                      </span>
                    </td>
                    <td>{tunnel.requestCount.toLocaleString()}</td>
                    <td>{formatBytes(tunnel.bytesTransferred)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(tunnel.connectedAt).toLocaleString()}
                    </td>
                    <td>
                      {tunnel.status === 'active' && (
                        <button
                          onClick={() => handleStop(tunnel.id)}
                          className="btn btn-danger btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Square size={12} />
                          Stop
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TunnelsTab;
