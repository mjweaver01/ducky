import type * as API from '@ducky.wtf/shared';

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
  subdomain?: string;
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

interface TeamRow {
  id: string;
  name: string;
  owner_id: string;
  max_members: number;
  created_at: any;
  updated_at: any;
  [key: string]: any;
}

interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: any;
  email: string;
  full_name?: string | null;
  [key: string]: any;
}

interface TeamInvitationRow {
  id: string;
  team_id: string;
  email: string;
  role: string;
  invited_by: string;
  token: string;
  expires_at: any;
  accepted_at?: any;
  created_at: any;
  [key: string]: any;
}

export const serializeTunnel = (t: TunnelRow): API.Tunnel => ({
  id: t.id,
  subdomain: t.subdomain,
  localPort: t.local_port,
  status: t.status,
  connectedAt: t.connected_at,
  disconnectedAt: t.disconnected_at ?? undefined,
  requestCount: t.request_count,
  bytesTransferred: t.bytes_transferred,
});

export const serializeTunnelStats = (s: TunnelStatsRow): API.TunnelStats => ({
  totalTunnels: parseInt(s.total_tunnels, 10),
  activeTunnels: parseInt(s.active_tunnels, 10),
  totalRequests: parseInt(s.total_requests, 10),
  totalBytes: parseInt(s.total_bytes, 10),
});

export const serializeToken = (t: TokenRow): API.Token => ({
  id: t.id,
  name: t.name,
  token: t.token,
  createdAt: t.created_at,
  lastUsedAt: t.last_used_at ?? undefined,
  isActive: t.is_active,
  subdomain: t.subdomain ?? undefined,
});

export const serializeDomain = (d: DomainRow): API.CustomDomain => ({
  id: d.id,
  domain: d.domain,
  verificationToken: d.verification_token,
  isVerified: d.is_verified,
  verifiedAt: d.verified_at ?? undefined,
  createdAt: d.created_at,
  isActive: d.is_active,
});

export const serializeUser = (u: UserRow): API.User => ({
  id: u.id,
  email: u.email,
  fullName: u.full_name ?? undefined,
  plan: (u.plan ?? 'free') as API.User['plan'],
  planExpiresAt: u.plan_expires_at ?? undefined,
  createdAt: u.created_at,
  lastLoginAt: u.last_login_at ?? undefined,
  updatedAt: u.updated_at ?? undefined,
  isActive: u.is_active,
});

export const serializeTeam = (t: TeamRow): API.Team => ({
  id: t.id,
  name: t.name,
  ownerId: t.owner_id,
  maxMembers: t.max_members,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
});

export const serializeTeamMember = (m: TeamMemberRow): API.TeamMember => ({
  id: m.id,
  teamId: m.team_id,
  userId: m.user_id,
  role: m.role as API.TeamMember['role'],
  joinedAt: m.joined_at,
  email: m.email,
  fullName: m.full_name ?? undefined,
});

export const serializeTeamInvitation = (i: TeamInvitationRow): API.TeamInvitation => ({
  id: i.id,
  teamId: i.team_id,
  email: i.email,
  role: i.role as API.TeamInvitation['role'],
  invitedBy: i.invited_by,
  token: i.token,
  expiresAt: i.expires_at,
  acceptedAt: i.accepted_at ?? undefined,
  createdAt: i.created_at,
});
