export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  is_active: boolean;
}

export interface AuthToken {
  id: string;
  user_id: string;
  token: string;
  name: string;
  created_at: Date;
  revoked_at?: Date;
  last_used_at?: Date;
  is_active: boolean;
}

export interface Tunnel {
  id: string;
  user_id: string;
  token_id?: string;
  subdomain: string;
  local_port: number;
  status: 'active' | 'disconnected' | 'stopped';
  connected_at: Date;
  disconnected_at?: Date;
  request_count: number;
  bytes_transferred: number;
}

export interface CustomDomain {
  id: string;
  user_id: string;
  domain: string;
  verification_token: string;
  is_verified: boolean;
  verified_at?: Date;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface UsageStats {
  id: string;
  user_id: string;
  tunnel_id?: string;
  request_count: number;
  bytes_transferred: number;
  error_count: number;
  date: Date;
  created_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: Date;
}
