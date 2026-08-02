-- Migration: 006_departments_and_teams.sql
-- Description: Schema additions for Department & Team Management
-- Author: VeriReview Engineering

-- Add columns to departments table
ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add columns to teams table
ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_head ON departments(head_id);
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_dept ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);
