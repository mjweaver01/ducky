import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Crown,
  UserCheck,
  Mail,
  Shield,
  X,
  Building2,
  Edit2,
  Check,
} from 'lucide-react';
import type { Team, TeamMember, TeamInvitation, User } from '@ducky.wtf/shared';
import QuackingDuck from '../QuackingDuckIcon';
import { teamsAPI, userAPI } from '../../api';
import './TeamTab.css';

const TeamTab: React.FC = () => {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserMember, setCurrentUserMember] = useState<TeamMember | null>(null);
  const [editingTeamName, setEditingTeamName] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await userAPI.getProfile();
      setUser(userData);

      if (userData.plan === 'enterprise') {
        try {
          const teamData = await teamsAPI.get();
          setTeam(teamData);
          await loadTeamData(teamData.id, userData);
        } catch (error: any) {
          if (error.response?.status !== 404) {
            console.error('Failed to load team:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamData = async (teamId: string, userData?: User) => {
    try {
      const [membersData, invitationsData] = await Promise.all([
        teamsAPI.getMembers(teamId),
        teamsAPI.getInvitations(teamId).catch(() => []),
      ]);
      setMembers(membersData);
      setInvitations(invitationsData);

      const currentUser = userData || user;
      const currentMember = membersData.find((m) => m.email === currentUser?.email);
      setCurrentUserMember(currentMember || null);
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const newTeam = await teamsAPI.create(teamName);
      setTeam(newTeam);
      setTeamName('');
      setShowCreateTeam(false);
      await loadTeamData(newTeam.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    setInviting(true);
    setError(null);
    try {
      await teamsAPI.inviteMember(team.id, inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      await loadTeamData(team.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!team) return;
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await teamsAPI.removeMember(team.id, userId);
      await loadTeamData(team.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string, memberName: string) => {
    if (!team) return;
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!confirm(`Change ${memberName}'s role to ${newRole}?`)) return;
    try {
      await teamsAPI.updateMemberRole(team.id, userId, newRole);
      await loadTeamData(team.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to change role');
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!team) return;
    if (!confirm(`Revoke invitation for ${email}?`)) return;
    try {
      await teamsAPI.revokeInvitation(team.id, invitationId);
      await loadTeamData(team.id);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  const handleEditTeamName = () => {
    if (!team) return;
    setNewTeamName(team.name);
    setEditingTeamName(true);
    setError(null);
  };

  const handleSaveTeamName = async () => {
    if (!team || !newTeamName.trim()) return;
    try {
      const updatedTeam = await teamsAPI.updateName(team.id, newTeamName.trim());
      setTeam(updatedTeam);
      setEditingTeamName(false);
      setNewTeamName('');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update team name');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team) return;
    if (!confirm(`Delete "${team.name}" and remove all members? This cannot be undone.`)) return;
    try {
      await teamsAPI.delete(team.id);
      setTeam(null);
      setMembers([]);
      setInvitations([]);
      setCurrentUserMember(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete team');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return (
          <span className="role-badge role-owner">
            <Crown size={12} /> Owner
          </span>
        );
      case 'admin':
        return (
          <span className="role-badge role-admin">
            <Shield size={12} /> Admin
          </span>
        );
      default:
        return (
          <span className="role-badge role-member">
            <UserCheck size={12} /> Member
          </span>
        );
    }
  };

  const canInvite = currentUserMember && ['owner', 'admin'].includes(currentUserMember.role);
  const canManage = currentUserMember?.role === 'owner';

  if (loading) {
    return (
      <div className="loading">
        <QuackingDuck size={75} wobble autoQuack />
      </div>
    );
  }

  if (user?.effectivePlan !== 'enterprise') {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Collaborate with your team on tunnels and domains</p>
        </div>

        <div className="card upgrade-banner">
          <div className="upgrade-banner-content">
            <Building2 size={32} className="upgrade-banner-icon" />
            <div>
              <h3 className="upgrade-banner-title">Enterprise Plan Required</h3>
              <p className="upgrade-banner-text">
                Team management is available exclusively on the Enterprise plan. Upgrade to invite
                team members, collaborate on tunnels and custom domains, and manage roles.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => (window.location.href = '/pricing?highlight=enterprise')}
              >
                Upgrade to Enterprise
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Collaborate with your team on tunnels and domains</p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError(null)} className="alert-close">
              <X size={16} />
            </button>
          </div>
        )}

        {showCreateTeam ? (
          <div className="card">
            <h3 className="create-team-title">Create Your Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group">
                <label htmlFor="teamName">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  className="input"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Engineering Team, ACME Corp"
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card empty-state">
            <Users size={48} className="empty-icon" />
            <h3>No Team Yet</h3>
            <p>Create a team to invite members and collaborate together.</p>
            <button
              onClick={() => setShowCreateTeam(true)}
              className="btn btn-primary"
              style={{ marginTop: '1rem' }}
            >
              <Plus size={16} />
              Create Team
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Team Management</h1>
        {editingTeamName ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              className="input"
              style={{ maxWidth: '300px', marginBottom: 0 }}
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditingTeamName(false);
                  setNewTeamName('');
                }
              }}
              placeholder="Team name"
              autoFocus
            />
            <button onClick={handleSaveTeamName} className="btn btn-primary btn-sm">
              <Check size={14} />
            </button>
            <button
              onClick={() => {
                setEditingTeamName(false);
                setNewTeamName('');
              }}
              className="btn btn-secondary btn-sm"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="team-name-container">
            <p
              className={`page-subtitle ${canManage ? 'team-name-editable' : ''}`}
              onClick={canManage ? handleEditTeamName : undefined}
              style={canManage ? { cursor: 'pointer' } : undefined}
            >
              {team.name}
            </p>
            {canManage && (
              <div className="team-actions">
                <button
                  onClick={handleEditTeamName}
                  className="btn btn-secondary btn-sm"
                  title="Rename team"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={handleDeleteTeam}
                  className="btn btn-danger btn-sm"
                  title="Delete team"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        )}
        {canInvite && (
          <div className="page-actions">
            <button onClick={() => setShowInviteForm(!showInviteForm)} className="btn btn-primary">
              <Mail size={16} />
              Invite Member
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)} className="alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="team-cards-container">
        {showInviteForm && (
          <div className="card invite-form-card">
            <h3 className="invite-form-title">Invite Team Member</h3>
            <form onSubmit={handleInviteMember}>
              <div className="form-group">
                <label htmlFor="inviteEmail">Email Address</label>
                <input
                  id="inviteEmail"
                  type="email"
                  className="input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="inviteRole">Role</label>
                <select
                  id="inviteRole"
                  className="input"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                >
                  <option value="member">Member - Can view team resources</option>
                  <option value="admin">Admin - Can invite and manage members</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={inviting}>
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                    setInviteRole('member');
                    setError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div className="team-info">
            <h3>
              Team Members ({members.length}/{team.maxMembers})
            </h3>
          </div>

          <div className="team-table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  {(canInvite || canManage) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-info">
                        <div className="member-avatar">{member.email[0].toUpperCase()}</div>
                        <strong>{member.fullName || 'Unknown'}</strong>
                      </div>
                    </td>
                    <td>{member.email}</td>
                    <td>{getRoleBadge(member.role)}</td>
                    <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                    {(canInvite || canManage) && (
                      <td>
                        {member.role !== 'owner' && (
                          <div className="table-actions">
                            {canManage && (
                              <button
                                onClick={() =>
                                  handleChangeRole(
                                    member.userId,
                                    member.role,
                                    member.fullName || member.email
                                  )
                                }
                                className="btn btn-secondary btn-sm"
                                title={`Change to ${member.role === 'admin' ? 'member' : 'admin'}`}
                              >
                                <Shield size={13} />
                              </button>
                            )}
                            {(canManage ||
                              (currentUserMember?.role === 'admin' &&
                                member.role === 'member')) && (
                              <button
                                onClick={() =>
                                  handleRemoveMember(member.userId, member.fullName || member.email)
                                }
                                className="btn btn-danger btn-sm"
                                title="Remove member"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {invitations.length > 0 && canInvite && (
          <div className="card">
            <div className="team-info">
              <h3>Pending Invitations ({invitations.length})</h3>
            </div>
            <div className="team-table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited</th>
                    <th>Expires</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td>{invitation.email}</td>
                      <td>{getRoleBadge(invitation.role)}</td>
                      <td>{new Date(invitation.createdAt).toLocaleDateString()}</td>
                      <td>{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                          className="btn btn-danger btn-sm"
                        >
                          <X size={13} />
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamTab;
