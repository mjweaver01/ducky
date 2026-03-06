import React, { useEffect, useRef, useState } from 'react';
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
import { useVirtualizer } from '@tanstack/react-virtual';
import { tunnelsAPI, type Tunnel, type TunnelStats } from '../api';
import QuackingDuck from './QuackingDuckIcon';
import './TunnelsTab.css';

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
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: tunnels.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

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
            <div className="stat-value stat-value-primary">{stats.activeTunnels}</div>
            <div className="stat-label">Active Tunnels</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon-success">
              <Wifi size={20} />
            </div>
            <div className="stat-value stat-value-success">{stats.totalTunnels}</div>
            <div className="stat-label">Total Tunnels</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon-secondary">
              <BarChart3 size={20} />
            </div>
            <div className="stat-value stat-value-secondary">
              {stats.totalRequests.toLocaleString()}
            </div>
            <div className="stat-label">Total Requests</div>
          </div>
          <div className="card stat-card">
            <div className="stat-icon stat-icon-warning">
              <Database size={20} />
            </div>
            <div className="stat-value stat-value-warning">{formatBytes(stats.totalBytes)}</div>
            <div className="stat-label">Data Transferred</div>
          </div>
        </div>
      )}

      <div className="card">
        {tunnels.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} className="tunnels-empty-activity-icon" />
            <h3>No tunnels yet</h3>
            <p>Start a tunnel using the CLI to expose your local server.</p>
            <div className="code-demo tunnels-code-demo">
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
          <div ref={tableContainerRef} className="tunnels-table-container">
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
                {rowVirtualizer.getVirtualItems().length > 0 && rowVirtualizer.getVirtualItems()[0].start > 0 && (
                  <tr>
                    <td colSpan={7} style={{ height: rowVirtualizer.getVirtualItems()[0].start, padding: 0, border: 0 }} />
                  </tr>
                )}
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const tunnel = tunnels[virtualRow.index];
                  const url = getTunnelUrl(tunnel.subdomain);
                  const copyId = `url-${tunnel.id}`;
                  return (
                    <tr key={tunnel.id} data-index={virtualRow.index}>
                      <td>
                        <div className="tunnel-url-cell">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tunnel-url-link"
                          >
                            {url}
                            <ExternalLink size={12} className="tunnel-url-icon" />
                          </a>
                          <button
                            onClick={() => handleCopy(url, copyId)}
                            className="btn btn-secondary tunnel-url-copy"
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
                      <td className="tunnel-date-cell">
                        {new Date(tunnel.connectedAt).toLocaleString()}
                      </td>
                      <td>
                        {tunnel.status === 'active' && (
                          <button
                            onClick={() => handleStop(tunnel.id)}
                            className="btn btn-danger btn-sm tunnel-stop-btn"
                          >
                            <Square size={12} />
                            Stop
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const items = rowVirtualizer.getVirtualItems();
                  const paddingBottom = items.length > 0
                    ? rowVirtualizer.getTotalSize() - items[items.length - 1].end
                    : 0;
                  return paddingBottom > 0 ? (
                    <tr>
                      <td colSpan={7} style={{ height: paddingBottom, padding: 0, border: 0 }} />
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

export default TunnelsTab;
