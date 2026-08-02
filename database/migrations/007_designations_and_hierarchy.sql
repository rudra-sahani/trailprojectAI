-- Migration: 007_designations_and_hierarchy.sql
-- Description: Schema additions for Designation Management and Reporting Hierarchy
-- Author: VeriReview Engineering

-- Add missing columns to designations table
ALTER TABLE designations ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS seniority_level INT DEFAULT 1;
ALTER TABLE designations ADD COLUMN IF NOT EXISTS job_family TEXT DEFAULT 'Engineering';
ALTER TABLE designations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE';

-- Add indexes for fast hierarchy and designation lookups
CREATE INDEX IF NOT EXISTS idx_designations_dept ON designations(department_id);
CREATE INDEX IF NOT EXISTS idx_designations_org ON designations(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_manager ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation_id);
