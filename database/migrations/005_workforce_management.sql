-- Migration: 005_workforce_management.sql
-- Description: Schema additions for Enterprise Workforce Management (Designations, Extended User fields, Department/Team enhancements)
-- Author: VeriReview Engineering

-- 1. Create Designations Table
CREATE TABLE IF NOT EXISTS designations (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  level TEXT DEFAULT 'L3',
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add extended workforce fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES designations(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time';
ALTER TABLE users ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Remote';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 3. Add head_id and is_archived to departments
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 4. Add is_archived to teams
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation_id);
CREATE INDEX IF NOT EXISTS idx_designations_org ON designations(organization_id);
