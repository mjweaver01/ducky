import api from './client';

import type {
  User,
  AuthResponse,
  Token,
  Tunnel,
  TunnelStats,
  CustomDomain,
  Team,
  TeamMember,
  TeamInvitation,
} from '@ducky.wtf/shared';

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

  async forgotPassword(email: string): Promise<{ message: string; resetUrl?: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post('/auth/reset-password', { token, newPassword });
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

  async updateSubdomain(id: string, subdomain: string): Promise<Token> {
    const response = await api.patch<{ token: Token }>(`/tokens/${id}/subdomain`, { subdomain });
    return response.data.token;
  },

  async regenerateSubdomain(id: string): Promise<Token> {
    const response = await api.post<{ token: Token }>(`/tokens/${id}/regenerate-subdomain`);
    return response.data.token;
  },

  async revoke(id: string): Promise<void> {
    await api.delete(`/tokens/${id}`);
  },
};

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

export const billingAPI = {
  async confirmSession(sessionId: string): Promise<void> {
    await api.get('/billing/confirm-session', { params: { session_id: sessionId } });
  },
};

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

export const teamsAPI = {
  async create(name: string): Promise<Team> {
    const response = await api.post<{ team: Team }>('/teams', { name });
    return response.data.team;
  },

  async get(): Promise<Team> {
    const response = await api.get<{ team: Team }>('/teams');
    return response.data.team;
  },

  async getMembers(teamId: string): Promise<TeamMember[]> {
    const response = await api.get<{ members: TeamMember[] }>(`/teams/${teamId}/members`);
    return response.data.members;
  },

  async inviteMember(
    teamId: string,
    email: string,
    role: 'admin' | 'member'
  ): Promise<TeamInvitation> {
    const response = await api.post<{ invitation: TeamInvitation }>(
      `/teams/${teamId}/invitations`,
      { email, role }
    );
    return response.data.invitation;
  },

  async acceptInvitation(token: string, userId: string): Promise<void> {
    await api.post('/teams/accept-invitation', { token, userId });
  },

  async getInvitations(teamId: string): Promise<TeamInvitation[]> {
    const response = await api.get<{ invitations: TeamInvitation[] }>(
      `/teams/${teamId}/invitations`
    );
    return response.data.invitations;
  },

  async revokeInvitation(teamId: string, invitationId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/invitations/${invitationId}`);
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/members/${userId}`);
  },

  async updateMemberRole(
    teamId: string,
    userId: string,
    role: 'admin' | 'member'
  ): Promise<TeamMember> {
    const response = await api.patch<{ member: TeamMember }>(`/teams/${teamId}/members/${userId}`, {
      role,
    });
    return response.data.member;
  },

  async updateName(teamId: string, name: string): Promise<Team> {
    const response = await api.patch<{ team: Team }>(`/teams/${teamId}`, { name });
    return response.data.team;
  },

  async delete(teamId: string): Promise<void> {
    await api.delete(`/teams/${teamId}`);
  },
};
