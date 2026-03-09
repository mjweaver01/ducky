import { Router, Request } from 'express';
import { AuthRequest } from '@ducky.wtf/shared';
import { TeamRepository, UserRepository } from '@ducky.wtf/database';
import { authenticateToken } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import {
  createTeamSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  acceptInvitationSchema,
} from '../validation/schemas';
import { asyncHandler } from '../utils/handlers';
import { serializeTeam, serializeTeamMember, serializeTeamInvitation } from '../utils/serializers';
import { sendTeamInvitationEmail } from '../lib/email';

const router = Router();
const teamRepo = new TeamRepository();
const userRepo = new UserRepository();

router.post(
  '/',
  authenticateToken,
  validateBody(createTeamSchema),
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    const user = await userRepo.findById(req.user!.id);
    if (!user || user.plan !== 'enterprise') {
      return res.status(403).json({ error: 'Team management requires Enterprise plan' });
    }

    const existingTeam = await teamRepo.findByOwnerId(req.user!.id);
    if (existingTeam) {
      return res.status(400).json({ error: 'You already have a team' });
    }

    const team = await teamRepo.create(name, req.user!.id);
    res.status(201).json({ team: serializeTeam(team) });
  })
);

router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const team = await teamRepo.findByUserId(req.user!.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ team: serializeTeam(team) });
  })
);

router.get(
  '/:id/members',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const member = await teamRepo.getMemberByUserId(req.params.id, req.user!.id);
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }

    const members = await teamRepo.getMembers(req.params.id);
    res.json({ members: members.map(serializeTeamMember) });
  })
);

router.post(
  '/:id/invitations',
  authenticateToken,
  validateBody(inviteMemberSchema),
  asyncHandler(async (req, res) => {
    const { email, role } = req.body;

    const member = await teamRepo.getMemberByUserId(req.params.id, req.user!.id);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only team owners and admins can invite members' });
    }

    const team = await teamRepo.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const memberCount = await teamRepo.getMemberCount(req.params.id);
    if (memberCount >= team.max_members) {
      return res.status(400).json({ error: 'Team has reached maximum member limit' });
    }

    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      const existingMember = await teamRepo.getMemberByUserId(req.params.id, existingUser.id);
      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this team' });
      }
    }

    const invitation = await teamRepo.createInvitation(req.params.id, email, role, req.user!.id);

    try {
      const inviter = await userRepo.findById(req.user!.id);
      await sendTeamInvitationEmail(
        email,
        team.name,
        invitation.token,
        inviter?.full_name || inviter?.email || 'A team member'
      );
    } catch (error) {
      console.error('Failed to send invitation email:', error);
    }

    res.status(201).json({ invitation: serializeTeamInvitation(invitation) });
  })
);

router.post(
  '/accept-invitation',
  authenticateToken,
  validateBody(acceptInvitationSchema),
  asyncHandler(async (req: Request & AuthRequest, res) => {
    const { token } = req.body;

    try {
      await teamRepo.acceptInvitation(token, req.user!.id);
      res.json({ message: 'Invitation accepted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to accept invitation' });
    }
  })
);

router.get(
  '/:id/invitations',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const member = await teamRepo.getMemberByUserId(req.params.id, req.user!.id);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only team owners and admins can view invitations' });
    }

    const invitations = await teamRepo.listPendingInvitations(req.params.id);
    res.json({ invitations: invitations.map(serializeTeamInvitation) });
  })
);

router.delete(
  '/:id/invitations/:invitationId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const member = await teamRepo.getMemberByUserId(req.params.id, req.user!.id);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only team owners and admins can revoke invitations' });
    }

    await teamRepo.revokeInvitation(req.params.invitationId);
    res.json({ message: 'Invitation revoked successfully' });
  })
);

router.delete(
  '/:id/members/:userId',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const member = await teamRepo.getMemberByUserId(req.params.id, req.user!.id);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Only team owners and admins can remove members' });
    }

    const targetMember = await teamRepo.getMemberByUserId(req.params.id, req.params.userId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove the team owner' });
    }

    if (member.role === 'admin' && targetMember.role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot remove other admins' });
    }

    await teamRepo.removeMember(req.params.id, req.params.userId);
    res.json({ message: 'Member removed successfully' });
  })
);

router.patch(
  '/:id/members/:userId',
  authenticateToken,
  validateBody(updateMemberRoleSchema),
  asyncHandler(async (req, res) => {
    const { role } = req.body;

    const member = await teamRepo.getMemberByUserId(req.params.id, req.user!.id);
    if (!member || member.role !== 'owner') {
      return res.status(403).json({ error: 'Only the team owner can change member roles' });
    }

    const targetMember = await teamRepo.getMemberByUserId(req.params.id, req.params.userId);
    if (!targetMember) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: 'Cannot change the owner role' });
    }

    const updatedMember = await teamRepo.updateMemberRole(req.params.id, req.params.userId, role);
    res.json({ member: serializeTeamMember({ ...updatedMember, email: '', full_name: null }) });
  })
);

router.patch(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await teamRepo.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the team owner can rename the team' });
    }

    const updatedTeam = await teamRepo.updateName(req.params.id, name);
    res.json({ team: serializeTeam(updatedTeam) });
  })
);

router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const team = await teamRepo.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the team owner can delete the team' });
    }

    await teamRepo.delete(req.params.id);
    res.json({ message: 'Team deleted successfully' });
  })
);

export default router;
