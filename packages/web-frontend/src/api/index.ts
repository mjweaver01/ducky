import api from './client';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const authAPI = {
  async register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      fullName,
    });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  setToken(token: string) {
    localStorage.setItem('token', token);
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  clearToken() {
    localStorage.removeItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

export const userAPI = {
  async getProfile(): Promise<User> {
    const response = await api.get<{ user: User }>('/user/me');
    return response.data.user;
  },

  async updateProfile(updates: { fullName?: string; email?: string }): Promise<User> {
    const response = await api.patch<{ user: User }>('/user/me', updates);
    return response.data.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/user/me/change-password', {
      currentPassword,
      newPassword,
    });
  },
};

export interface Token {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export const tokensAPI = {
  async list(): Promise<Token[]> {
    const response = await api.get<{ tokens: Token[] }>('/tokens');
    return response.data.tokens;
  },

  async create(name: string): Promise<Token> {
    const response = await api.post<{ token: Token }>('/tokens', { name });
    return response.data.token;
  },

  async update(id: string, name: string): Promise<Token> {
    const response = await api.patch<{ token: Token }>(`/tokens/${id}`, { name });
    return response.data.token;
  },

  async revoke(id: string): Promise<void> {
    await api.delete(`/tokens/${id}`);
  },
};

export interface Tunnel {
  id: string;
  subdomain: string;
  localPort: number;
  status: string;
  connectedAt: string;
  disconnectedAt?: string;
  requestCount: number;
  bytesTransferred: number;
}

export interface TunnelStats {
  totalTunnels: number;
  activeTunnels: number;
  totalRequests: number;
  totalBytes: number;
}

export const tunnelsAPI = {
  async list(status?: string): Promise<Tunnel[]> {
    const response = await api.get<{ tunnels: Tunnel[] }>('/tunnels', {
      params: { status },
    });
    return response.data.tunnels;
  },

  async get(id: string): Promise<Tunnel> {
    const response = await api.get<{ tunnel: Tunnel }>(`/tunnels/${id}`);
    return response.data.tunnel;
  },

  async stop(id: string): Promise<void> {
    await api.post(`/tunnels/${id}/stop`);
  },

  async getStats(): Promise<TunnelStats> {
    const response = await api.get<{ stats: TunnelStats }>('/tunnels/stats');
    return response.data.stats;
  },
};

export interface CustomDomain {
  id: string;
  domain: string;
  verificationToken: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
  isActive: boolean;
}

export const domainsAPI = {
  async list(): Promise<CustomDomain[]> {
    const response = await api.get<{ domains: CustomDomain[] }>('/domains');
    return response.data.domains;
  },

  async create(domain: string): Promise<CustomDomain> {
    const response = await api.post<{ domain: CustomDomain }>('/domains', { domain });
    return response.data.domain;
  },

  async verify(id: string): Promise<CustomDomain> {
    const response = await api.post<{ domain: CustomDomain }>(`/domains/${id}/verify`);
    return response.data.domain;
  },

  async regenerateToken(id: string): Promise<CustomDomain> {
    const response = await api.post<{ domain: CustomDomain }>(`/domains/${id}/regenerate-token`);
    return response.data.domain;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/domains/${id}`);
  },
};
