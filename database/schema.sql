-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    plan_expires_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT chk_users_plan CHECK (plan IN ('free', 'pro', 'enterprise'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_plan ON users(plan);
CREATE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id);

-- Auth tokens table
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL for anonymous tokens
    token VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE,
    is_anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_is_active ON auth_tokens(is_active);
CREATE INDEX idx_auth_tokens_subdomain ON auth_tokens(subdomain);
CREATE INDEX idx_auth_tokens_is_anonymous ON auth_tokens(is_anonymous);
CREATE INDEX idx_auth_tokens_token_active ON auth_tokens(token) WHERE is_active = true AND revoked_at IS NULL;

-- Tunnels table (for tracking active and historical tunnels)
CREATE TABLE tunnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_id UUID REFERENCES auth_tokens(id) ON DELETE SET NULL,
    subdomain VARCHAR(255) NOT NULL,
    local_port INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, disconnected, stopped
    connected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    disconnected_at TIMESTAMP,
    request_count BIGINT NOT NULL DEFAULT 0,
    bytes_transferred BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_tunnels_status CHECK (status IN ('active', 'disconnected', 'stopped'))
);

CREATE INDEX idx_tunnels_user_id ON tunnels(user_id);
CREATE INDEX idx_tunnels_subdomain ON tunnels(subdomain);
CREATE INDEX idx_tunnels_status ON tunnels(status);
CREATE INDEX idx_tunnels_connected_at ON tunnels(connected_at);
CREATE INDEX idx_tunnels_subdomain_status ON tunnels(subdomain, status) WHERE status = 'active';
CREATE UNIQUE INDEX idx_tunnels_subdomain_active ON tunnels(subdomain) WHERE status = 'active';

-- Custom domains table
CREATE TABLE custom_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    verification_token VARCHAR(255) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_custom_domains_user_id ON custom_domains(user_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);
CREATE INDEX idx_custom_domains_is_verified ON custom_domains(is_verified);

-- Usage statistics table (for analytics)
CREATE TABLE usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tunnel_id UUID REFERENCES tunnels(id) ON DELETE SET NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    bytes_transferred BIGINT NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX idx_usage_stats_date ON usage_stats(date);
CREATE INDEX idx_usage_stats_tunnel_id ON usage_stats(tunnel_id);
CREATE INDEX idx_usage_stats_user_date ON usage_stats(user_id, date);

-- Sessions table (for web sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Magic links table (for passwordless authentication and password reset)
CREATE TABLE magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    anonymous_token VARCHAR(255),
    purpose VARCHAR(50) NOT NULL DEFAULT 'login',
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_magic_links_purpose CHECK (purpose IN ('login', 'password_reset'))
);

CREATE INDEX idx_magic_links_token ON magic_links(token);
CREATE INDEX idx_magic_links_email ON magic_links(email);
CREATE INDEX idx_magic_links_expires_at ON magic_links(expires_at);
CREATE INDEX idx_magic_links_purpose ON magic_links(purpose);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_members INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- Team members table
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id),
    CONSTRAINT chk_team_members_role CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id);

-- Team invitations table
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_team_invitations_role CHECK (role IN ('admin', 'member'))
);

CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_expires_at ON team_invitations(expires_at);
CREATE INDEX idx_team_invitations_token_pending ON team_invitations(token) WHERE accepted_at IS NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_domains_updated_at BEFORE UPDATE ON custom_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Password hash for 'admin123' using bcrypt (cost 10)
INSERT INTO users (email, password_hash, full_name, is_active)
VALUES (
    'admin@ducky.wtf',
    '$2b$10$rKJ5qKqPKEHeHqQw8xQXM.YCKqXJGEX6XQvqQZxQXWKXPKGQXJGEH',
    'Admin User',
    true
);

-- Comments
COMMENT ON TABLE users IS 'User accounts';
COMMENT ON COLUMN users.plan IS 'Subscription plan: free, pro, enterprise';
COMMENT ON COLUMN users.plan_expires_at IS 'When the current paid plan expires (null for lifetime/free)';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID';
COMMENT ON TABLE auth_tokens IS 'API tokens for CLI authentication';
COMMENT ON COLUMN auth_tokens.subdomain IS 'Static subdomain for persistent tunnel URLs (pro/enterprise only)';
COMMENT ON COLUMN auth_tokens.is_anonymous IS 'True for tokens created without user login';
COMMENT ON TABLE tunnels IS 'Active and historical tunnel connections';
COMMENT ON TABLE custom_domains IS 'Custom domains configured by users';
COMMENT ON TABLE usage_stats IS 'Daily usage statistics per user/tunnel';
COMMENT ON TABLE sessions IS 'Web session tokens for authenticated users';
COMMENT ON TABLE magic_links IS 'Temporary tokens for passwordless magic link login and password reset';
COMMENT ON COLUMN magic_links.anonymous_token IS 'If set, associates this login with an existing anonymous token';
COMMENT ON COLUMN magic_links.purpose IS 'Purpose of the magic link: login, password_reset';
COMMENT ON TABLE teams IS 'Teams for Enterprise customers';
COMMENT ON COLUMN teams.owner_id IS 'User who owns the team (Enterprise customer)';
COMMENT ON COLUMN teams.max_members IS 'Maximum number of members allowed in the team';
COMMENT ON TABLE team_members IS 'Team membership records';
COMMENT ON COLUMN team_members.role IS 'Member role: owner, admin, member';
COMMENT ON TABLE team_invitations IS 'Pending team invitations';
COMMENT ON COLUMN team_invitations.token IS 'Unique token for accepting the invitation';
COMMENT ON COLUMN team_invitations.expires_at IS 'Invitation expiration timestamp (typically 7 days from creation)';
