/** Row shapes coming back from the database (snake_case columns).
 *  All fields typed loosely so any DB driver's concrete types are accepted. */
interface TunnelRow {
  id: string;
  subdomain: string;
  local_port: number;
  status: string;
  connected_at: any;
  disconnected_at?: any;
  request_count: number;
  bytes_transferred: number;
  [key: string]: any;
}

interface TunnelStatsRow {
  total_tunnels: any;
  active_tunnels: any;
  total_requests: any;
  total_bytes: any;
}

interface TokenRow {
  id: string;
  name: string;
  token: string;
  created_at: any;
  last_used_at?: any;
  is_active: boolean;
  [key: string]: any;
}

interface DomainRow {
  id: string;
  domain: string;
  verification_token: string;
  is_verified: boolean;
  verified_at?: any;
  created_at: any;
  is_active: boolean;
  [key: string]: any;
}

interface UserRow {
  id: string;
  email: string;
  full_name?: string | null;
  plan?: string;
  plan_expires_at?: any;
  created_at: any;
  last_login_at?: any;
  updated_at?: any;
  is_active: boolean;
  [key: string]: any;
}

export const serializeTunnel = (t: TunnelRow) => ({
  id: t.id,
  subdomain: t.subdomain,
  localPort: t.local_port,
  status: t.status,
  connectedAt: t.connected_at,
  disconnectedAt: t.disconnected_at ?? null,
  requestCount: t.request_count,
  bytesTransferred: t.bytes_transferred,
});

export const serializeTunnelStats = (s: TunnelStatsRow) => ({
  totalTunnels: parseInt(s.total_tunnels, 10),
  activeTunnels: parseInt(s.active_tunnels, 10),
  totalRequests: parseInt(s.total_requests, 10),
  totalBytes: parseInt(s.total_bytes, 10),
});

export const serializeToken = (t: TokenRow) => ({
  id: t.id,
  name: t.name,
  token: t.token,
  createdAt: t.created_at,
  lastUsedAt: t.last_used_at ?? null,
  isActive: t.is_active,
  subdomain: t.subdomain ?? null,
});

export const serializeDomain = (d: DomainRow) => ({
  id: d.id,
  domain: d.domain,
  verificationToken: d.verification_token,
  isVerified: d.is_verified,
  verifiedAt: d.verified_at ?? null,
  createdAt: d.created_at,
  isActive: d.is_active,
});

export const serializeUser = (u: UserRow) => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name ?? null,
  plan: u.plan ?? 'free',
  planExpiresAt: u.plan_expires_at ?? null,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at ?? null,
  updatedAt: u.updated_at ?? null,
  isActive: u.is_active,
});
