import React, { useEffect, useState } from 'react';
import { tunnelsAPI, type Tunnel, type TunnelStats } from '../api';

const TunnelsTab: React.FC = () => {
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [stats, setStats] = useState<TunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
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

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Tunnels</h1>
        <p className="page-subtitle">Monitor your active and historical tunnels</p>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="card">
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--primary)' }}>
              {stats.activeTunnels}
            </div>
            <div style={{ color: 'var(--gray)' }}>Active Tunnels</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>
              {stats.totalTunnels}
            </div>
            <div style={{ color: 'var(--gray)' }}>Total Tunnels</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--secondary)' }}>
              {stats.totalRequests.toLocaleString()}
            </div>
            <div style={{ color: 'var(--gray)' }}>Total Requests</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warning)' }}>
              {(stats.totalBytes / 1024 / 1024).toFixed(2)} MB
            </div>
            <div style={{ color: 'var(--gray)' }}>Data Transferred</div>
          </div>
        </div>
      )}

      <div className="card">
        {tunnels.length === 0 ? (
          <div>
            <p>No tunnels yet. Start one using the CLI:</p>
            <pre style={{ marginTop: '16px' }}>
              <code>ducky http 3000 --token YOUR_TOKEN</code>
            </pre>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Port</th>
                <th>Status</th>
                <th>Requests</th>
                <th>Connected</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tunnels.map((tunnel) => (
                <tr key={tunnel.id}>
                  <td><code>{tunnel.subdomain}</code></td>
                  <td>{tunnel.localPort}</td>
                  <td>
                    <span className={`badge badge-${tunnel.status === 'active' ? 'success' : 'warning'}`}>
                      {tunnel.status}
                    </span>
                  </td>
                  <td>{tunnel.requestCount}</td>
                  <td>{new Date(tunnel.connectedAt).toLocaleString()}</td>
                  <td>
                    {tunnel.status === 'active' && (
                      <button onClick={() => handleStop(tunnel.id)} className="btn btn-danger btn-sm">
                        Stop
                      </button>
                    )}
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

export default TunnelsTab;
