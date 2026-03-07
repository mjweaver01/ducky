import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Terminal, Code2, Zap, ArrowRight } from 'lucide-react';
import DuckIcon from '../components/DuckIcon';
import MarketingLayout from '../components/MarketingLayout';
import { docsNavItems, docsTrackedIds, type DocsNavItem } from '../docsNav';
import { useMetadata } from '../hooks/useMetadata';
import { pageMetadata } from '../metadata';
import './MarketingPages.css';

/* ─── Scroll-spy hook ─── */
function useActiveSection(): string | null {
  const { pathname } = useLocation();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setActiveId(null);

    const update = () => {
      /* 120 px accounts for the sticky nav (65 px) plus a comfortable buffer */
      const threshold = 120;
      let current: string | null = null;
      for (const id of docsTrackedIds) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id;
        }
      }
      setActiveId(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);

  return activeId;
}

/* ─── Introduction page ─── */
const IntroductionDoc: React.FC = () => {
  useMetadata(pageMetadata.docsIntro);

  return (
    <div className="doc-content">
      <h1>Introduction</h1>
      <p className="doc-lead">
        ducky lets you expose any local server to the internet in seconds. It's perfect for testing
        webhooks, sharing demos, and collaborating across networks.
      </p>

      <div className="doc-cards">
        <a href="/docs/install" className="doc-card">
          <Zap size={20} className="doc-card-icon" />
          <div>
            <strong>Quick Start</strong>
            <p>Get a tunnel running in under a minute.</p>
          </div>
          <ArrowRight size={16} className="doc-card-arrow" />
        </a>
        <a href="/docs/cli" className="doc-card">
          <Terminal size={20} className="doc-card-icon" />
          <div>
            <strong>CLI Reference</strong>
            <p>All commands, flags, and configuration options.</p>
          </div>
          <ArrowRight size={16} className="doc-card-arrow" />
        </a>
        <a href="/docs/api" className="doc-card">
          <Code2 size={20} className="doc-card-icon" />
          <div>
            <strong>API Reference</strong>
            <p>Integrate ducky programmatically via REST.</p>
          </div>
          <ArrowRight size={16} className="doc-card-arrow" />
        </a>
      </div>

      <h2>How it works</h2>
      <p>
        When you run{' '}
        <code>
          <span className="code-primary">ducky</span> http 3000
        </code>
        , the CLI opens a persistent WebSocket connection to our edge servers. Traffic arriving at
        your public URL is forwarded over that connection to your local port, and responses are sent
        back the same way. No ports need to be open on your machine; the connection is outbound
        only.
      </p>

      <div className="doc-diagram">
        <div className="diagram-box diagram-internet">Internet</div>
        <div className="diagram-arrow diagram-arrow-labeled">
          <span className="diagram-arrow-line">→</span>
          <span className="diagram-arrow-label">HTTPS</span>
        </div>
        <div className="diagram-box diagram-edge">ducky edge</div>
        <div className="diagram-arrow diagram-arrow-labeled">
          <span className="diagram-arrow-line">↔</span>
          <span className="diagram-arrow-label">WebSocket</span>
        </div>
        <div className="diagram-box diagram-cli">ducky CLI</div>
        <div className="diagram-arrow diagram-arrow-labeled">
          <span className="diagram-arrow-line">→</span>
          <span className="diagram-arrow-label">HTTP</span>
        </div>
        <div className="diagram-box diagram-local">localhost:3000</div>
      </div>

      <h2>Use cases</h2>
      <ul className="doc-list">
        <li>
          <strong>Webhook testing</strong> — receive GitHub, Stripe, or Twilio callbacks on your
          local server.
        </li>
        <li>
          <strong>Client demos</strong> — share a work-in-progress with stakeholders without
          deploying.
        </li>
        <li>
          <strong>Mobile testing</strong> — hit your dev server from a real device on a different
          network.
        </li>
        <li>
          <strong>Pair programming</strong> — let a collaborator browse your local app in real time.
        </li>
      </ul>
    </div>
  );
};

/* ─── CLI Reference ─── */
const CliDoc: React.FC = () => {
  useMetadata(pageMetadata.docsCli);

  return (
    <div className="doc-content">
      <h1>CLI Reference</h1>
      <p className="doc-lead">The ducky CLI is the primary way to create and manage tunnels.</p>

      <h2 id="install">Installation</h2>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">npm</div>
        <pre>
          <code>npm install -g @ducky.wtf/cli</code>
        </pre>
      </div>

      <h2 id="config">Authentication setup</h2>
      <p>
        Before creating tunnels, save your auth token. Generate one in the{' '}
        <a href="/dashboard/tokens">dashboard</a>.
      </p>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Save your token</div>
        <pre>
          <code>
            <span className="code-primary">ducky</span>
            {' config auth YOUR_TOKEN'}
          </code>
        </pre>
      </div>
      <p>
        You can also pass the token inline with <code>--authtoken</code> on any command without
        saving it to disk.
      </p>

      <h2 id="http">ducky http</h2>
      <p>Expose a local HTTP server on a given port or address.</p>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Usage</div>
        <pre>
          <code>{`ducky http <port|address:port> [flags]

Flags:
  --authtoken <token>   Auth token (overrides saved config)
  --url       <url>     Request a specific tunnel URL
  --config    <path>    Path to a custom config file
  --server-url <url>    Tunnel server WebSocket URL (default: wss://ducky.wtf/_tunnel)`}</code>
        </pre>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Examples</div>
        <pre>
          <code>
            {'# Expose port 3000 (uses saved authtoken)\n'}
            <span className="code-primary">ducky</span>
            {' http 3000\n\n# Expose a specific host:port\n'}
            <span className="code-primary">ducky</span>
            {' http 192.168.1.2:8080\n\n# Pass an authtoken inline\n'}
            <span className="code-primary">ducky</span>
            {' http 3000 --authtoken YOUR_TOKEN\n\n# Request a specific tunnel URL\n'}
            <span className="code-primary">ducky</span>
            {' http 3000 --url https://myapp.'}
            <span className="code-primary">ducky.wtf</span>
          </code>
        </pre>
      </div>

      <h2 id="static-urls">Static URLs (Pro &amp; Enterprise)</h2>
      <p>
        On Pro and Enterprise plans, each auth token is assigned a permanent subdomain. Your tunnel
        URL stays the same every time you connect — no more updating webhook configurations after a
        restart.
      </p>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Same URL every time</div>
        <pre>
          <code>
            {'# First run\n'}
            <span className="code-primary">ducky</span>
            {' http 3000\n✓ Tunnel established: https://myapp.'}
            <span className="code-primary">ducky.wtf</span>
            {' → localhost:3000\n\n# Next run — same URL\n'}
            <span className="code-primary">ducky</span>
            {' http 3000\n✓ Tunnel established: https://myapp.'}
            <span className="code-primary">ducky.wtf</span>
            {' → localhost:3000'}
          </code>
        </pre>
      </div>
      <p>
        You can customize your subdomain in the <a href="/dashboard/tokens">Auth Tokens</a>{' '}
        dashboard — click the edit icon next to your static URL. Subdomains must be 3–20 lowercase
        letters and numbers. You can also regenerate to get a new random one at any time.
      </p>

      <h2 id="logout">ducky logout</h2>
      <p>
        Clear your saved auth token and credentials from <code>~/.ducky/config.json</code>. After
        logging out, running <code>ducky http</code> will create a new anonymous tunnel.
      </p>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Usage</div>
        <pre>
          <code>
            <span className="code-primary">ducky</span>
            {' logout'}
          </code>
        </pre>
      </div>

      <h2 id="config-commands">Config commands</h2>
      <p>
        Settings are stored in <code>~/.ducky/config.json</code>. Use the <code>config</code>{' '}
        subcommands to manage them without editing the file directly.
      </p>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Usage</div>
        <pre>
          <code>
            <span className="code-primary">ducky</span>
            {' config auth <token>                   Save your auth token\n'}
            <span className="code-primary">ducky</span>
            {
              ' config add-server-url <url>           Save a custom server URL\n\n# Production server URL\n'
            }
            <span className="code-primary">ducky</span>
            {' config add-server-url wss://tunnel.'}
            <span className="code-primary">ducky.wtf</span>
            {'/_tunnel'}
          </code>
        </pre>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">~/.ducky/config.json (example)</div>
        <pre>
          <code>{`{
  "authToken": "YOUR_TOKEN",
  "serverUrl": "wss://tunnel.ducky.wtf/_tunnel"
}`}</code>
        </pre>
      </div>
    </div>
  );
};

/* ─── API Reference ─── */
const ApiDoc: React.FC = () => {
  useMetadata(pageMetadata.docsApi);

  return (
    <div className="doc-content">
      <h1>API Reference</h1>
      <p className="doc-lead">
        The ducky REST API lets you manage tunnels, tokens, and domains programmatically. Base URL:{' '}
        <code>https://api.ducky.wtf/api</code>
      </p>

      <h2 id="auth">Authentication</h2>
      <p>
        Protected endpoints require a Bearer token in the <code>Authorization</code> header.
        Generate tokens in the <a href="/dashboard/tokens">dashboard</a> or via{' '}
        <code>POST /api/auth/register</code>.
      </p>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Header</div>
        <pre>
          <code>Authorization: Bearer YOUR_TOKEN</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/auth/register</code>
        <span className="api-desc">Create a new account</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "email": "you@example.com", "password": "••••••••", "fullName": "Your Name" }`}</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/auth/login</code>
        <span className="api-desc">Log in and receive a JWT</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Response</div>
        <pre>
          <code>{`{ "user": { "id": "...", "email": "you@example.com" }, "token": "eyJ..." }`}</code>
        </pre>
      </div>

      <h2 id="tunnels">Tunnels</h2>

      <div className="api-endpoint">
        <span className="api-method api-get">GET</span>
        <code>/api/tunnels</code>
        <span className="api-desc">
          List your tunnels — optional <code>?status=active</code>
        </span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Response</div>
        <pre>
          <code>{`{
  "tunnels": [
    {
      "id": "a1b2c3d4...",
      "subdomain": "abc123",
      "localPort": 3000,
      "status": "active",
      "connectedAt": "2026-02-28T10:00:00Z",
      "disconnectedAt": null,
      "requestCount": 42,
      "bytesTransferred": 102400
    }
  ]
}`}</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-get">GET</span>
        <code>/api/tunnels/stats</code>
        <span className="api-desc">Aggregate stats across all your tunnels</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-get">GET</span>
        <code>/api/tunnels/{'{id}'}</code>
        <span className="api-desc">Get a single tunnel by ID</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/tunnels/{'{id}'}/stop</code>
        <span className="api-desc">Stop an active tunnel</span>
      </div>

      <h2 id="tokens">Auth Tokens</h2>

      <div className="api-endpoint">
        <span className="api-method api-get">GET</span>
        <code>/api/tokens</code>
        <span className="api-desc">List all your auth tokens</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/tokens</code>
        <span className="api-desc">Create a new token</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "name": "My Laptop" }`}</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-patch">PATCH</span>
        <code>/api/tokens/{'{id}'}</code>
        <span className="api-desc">Rename a token</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "name": "New Name" }`}</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-patch">PATCH</span>
        <code>/api/tokens/{'{id}'}/subdomain</code>
        <span className="api-desc">Set a custom subdomain — Pro &amp; Enterprise only</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "subdomain": "myapp" }  // results in myapp.ducky.wtf`}</code>
        </pre>
      </div>
      <p style={{ fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
        Subdomain must be 3–20 lowercase letters and numbers. Returns <code>409</code> if already
        taken.
      </p>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/tokens/{'{id}'}/regenerate-subdomain</code>
        <span className="api-desc">Assign a new random subdomain — Pro &amp; Enterprise only</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-delete">DELETE</span>
        <code>/api/tokens/{'{id}'}</code>
        <span className="api-desc">Revoke (delete) a token</span>
      </div>

      <h2 id="domains">Custom Domains</h2>

      <div className="api-endpoint">
        <span className="api-method api-get">GET</span>
        <code>/api/domains</code>
        <span className="api-desc">List your custom domains</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/domains</code>
        <span className="api-desc">Register a new custom domain</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "domain": "tunnel.mycompany.com" }`}</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/domains/{'{id}'}/verify</code>
        <span className="api-desc">Trigger DNS TXT record verification check</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/domains/{'{id}'}/regenerate-token</code>
        <span className="api-desc">Regenerate the DNS verification token</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-delete">DELETE</span>
        <code>/api/domains/{'{id}'}</code>
        <span className="api-desc">Delete a custom domain</span>
      </div>

      <h2 id="user">User</h2>

      <div className="api-endpoint">
        <span className="api-method api-get">GET</span>
        <code>/api/user/me</code>
        <span className="api-desc">Get your profile</span>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-patch">PATCH</span>
        <code>/api/user/me</code>
        <span className="api-desc">Update name or email</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "fullName": "New Name", "email": "new@example.com" }`}</code>
        </pre>
      </div>

      <div className="api-endpoint">
        <span className="api-method api-post">POST</span>
        <code>/api/user/me/change-password</code>
        <span className="api-desc">Change your password</span>
      </div>
      <div className="doc-codeblock">
        <div className="doc-codeblock-header">Request body</div>
        <pre>
          <code>{`{ "currentPassword": "old", "newPassword": "new" }`}</code>
        </pre>
      </div>
    </div>
  );
};

/* ─── Docs shell with sidebar ─── */
const DocsShell: React.FC = () => {
  const { pathname } = useLocation();
  const activeId = useActiveSection();

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-logo">
          <DuckIcon size={20} className="logo-icon docs-logo-icon" />
          <span className="docs-sidebar-title">Docs</span>
        </div>
        {docsNavItems.map((group) => (
          <div key={group.group} className="docs-nav-group">
            <div className="docs-nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const hashIdx = item.to.indexOf('#');
              const itemPath = hashIdx === -1 ? item.to : item.to.slice(0, hashIdx);
              const itemHash = hashIdx === -1 ? null : item.to.slice(hashIdx + 1);
              const onThisRoute = pathname === itemPath;

              let isActive: boolean;
              if (itemHash) {
                isActive = onThisRoute && activeId === itemHash;
              } else {
                /* Route-level item is active when on this route and no hash
                   section belonging to this route has scrolled into view yet */
                const routeHashIds = docsNavItems
                  .flatMap((g) => g.items)
                  .filter((i: DocsNavItem) => i.to.startsWith(item.to + '#'))
                  .map((i: DocsNavItem) => i.to.split('#')[1]);
                isActive = onThisRoute && !routeHashIds.includes(activeId ?? '');
              }

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`docs-nav-item${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
      <main className="docs-main">
        <Routes>
          <Route index element={<IntroductionDoc />} />
          <Route path="install" element={<Navigate to="/docs/cli" replace />} />
          <Route path="quickstart" element={<Navigate to="/docs" replace />} />
          <Route path="cli" element={<CliDoc />} />
          <Route path="api" element={<ApiDoc />} />
          <Route path="*" element={<Navigate to="/docs" replace />} />
        </Routes>
      </main>
    </div>
  );
};

/* ─── Exported wrapper ─── */
const DocsPage: React.FC = () => (
  <MarketingLayout>
    <div className="docs-page-divider">
      <DocsShell />
    </div>
  </MarketingLayout>
);

export default DocsPage;
