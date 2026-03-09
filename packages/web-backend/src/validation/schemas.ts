import { z } from 'zod';

// Common schemas
export const idSchema = z.string().uuid();
export const emailSchema = z.string().email();
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Auth schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Token schemas
export const createTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(100),
});

export const updateTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(100),
});

export const updateSubdomainSchema = z.object({
  subdomain: z
    .string()
    .regex(
      /^[a-z0-9]{3,20}$/,
      'Subdomain must be 3-20 characters (lowercase letters and numbers only)'
    ),
});

// Domain schemas
export const createDomainSchema = z.object({
  domain: z
    .string()
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i,
      'Invalid domain format'
    ),
});

// Team schemas
export const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'member']),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

// User schemas
export const updateProfileSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: emailSchema.optional(),
});

// Billing schemas
export const createCheckoutSessionSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
  interval: z.enum(['month', 'year']),
});

// Tunnel schemas
export const tunnelStatusSchema = z.enum(['active', 'disconnected', 'stopped']).optional();
