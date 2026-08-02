-- Migration: 004_organization_onboarding.sql
-- Description: Schema for Enterprise Organization Onboarding, Invitations, and Role Management
-- Author: VeriReview Engineering
-- Justification: Adds organizations and invitations tables, adds organization_id foreign keys, and supports enterprise onboarding.

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  industry TEXT,
  company_size TEXT,
  website TEXT,
  timezone TEXT DEFAULT 'UTC',
  default_review_cycle TEXT DEFAULT 'Q2 2026',
  language TEXT DEFAULT 'en',
  review_frequency TEXT DEFAULT 'Quarterly',
  org_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add organization_id to users if not present
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 3. Add organization_id to departments and teams
ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 4. Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  invitation_code TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
  invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
