-- Migration: 001_initial_schema.sql
-- Description: Core Relational Database Schema for VeriReview AI
-- Author: Roo Code
-- Justification: Implements normalized entities for users, departments, review cycles, feedback, evidence, claims, bias, reports, and audit logs per DATABASE.md.

CREATE TYPE user_role AS ENUM ('OWNER', 'EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SYSTEM');
CREATE TYPE feedback_source AS ENUM ('SELF_ASSESSMENT', 'PEER_FEEDBACK', 'MANAGER_FEEDBACK', 'GOALS', 'PROJECT_OUTCOMES', 'MEETING_NOTES');
CREATE TYPE review_status AS ENUM ('DRAFT', 'COLLECTING_FEEDBACK', 'READY_FOR_AI', 'PIPELINE_RUNNING', 'HUMAN_REVIEW', 'FINALIZED', 'ESCALATED', 'FAILED');
CREATE TYPE bias_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE bias_type AS ENUM ('source_imbalance', 'recency_weighted', 'sentiment_extremity', 'unsupported_claim');
CREATE TYPE claim_status AS ENUM ('PENDING', 'ACCEPTED', 'EDITED', 'REJECTED');

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  employee_code TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  organization_id UUID,
  department_id UUID,
  team_id UUID,
  manager_id UUID,
  phone TEXT,
  job_title TEXT,
  employment_type TEXT DEFAULT 'Full-time',
  joining_date DATE DEFAULT CURRENT_DATE,
  location TEXT DEFAULT 'Remote',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  organization_id UUID,
  head_id UUID,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY,
  department_id UUID REFERENCES departments(id),
  manager_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Review Cycles Table
CREATE TABLE IF NOT EXISTS review_cycles (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES users(id) NOT NULL,
  manager_id UUID REFERENCES users(id) NOT NULL,
  review_period TEXT NOT NULL,
  status review_status NOT NULL DEFAULT 'DRAFT',
  started_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, review_period)
);

-- Raw Feedback Table (Append-only staging)
CREATE TABLE IF NOT EXISTS raw_feedback (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id) NOT NULL,
  submitted_by UUID REFERENCES users(id),
  source_type feedback_source NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence Nodes Table
CREATE TABLE IF NOT EXISTS evidence_nodes (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id) NOT NULL,
  raw_feedback_id UUID REFERENCES raw_feedback(id),
  source_type feedback_source NOT NULL,
  author_role TEXT NOT NULL,
  author_id UUID,
  title TEXT,
  normalized_text TEXT NOT NULL CHECK (char_length(normalized_text) <= 2000),
  tags JSONB DEFAULT '[]'::jsonb,
  confidence NUMERIC(3,2) DEFAULT 1.0,
  status TEXT DEFAULT 'ACCEPTED',
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Claim Candidates Table
CREATE TABLE IF NOT EXISTS claim_candidates (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id) NOT NULL,
  claim_text TEXT NOT NULL,
  theme TEXT NOT NULL,
  evidence_ids JSONB DEFAULT '[]'::jsonb,
  source_count INT DEFAULT 0,
  role_diversity JSONB DEFAULT '{"self":0,"peer":0,"manager":0}'::jsonb,
  coverage_confidence NUMERIC(3,2) NOT NULL CHECK (coverage_confidence >= 0.0 AND coverage_confidence <= 1.0),
  status TEXT NOT NULL DEFAULT 'SUFFICIENT',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT coverage_floor_check CHECK (
    (coverage_confidence >= 0.3 AND status = 'SUFFICIENT') OR (status = 'INSUFFICIENT_EVIDENCE')
  )
);

-- Bias Flags Table
CREATE TABLE IF NOT EXISTS bias_flags (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id) NOT NULL,
  claim_id UUID REFERENCES claim_candidates(id),
  bias_type bias_type NOT NULL,
  severity bias_severity NOT NULL,
  explanation TEXT NOT NULL CHECK (char_length(explanation) >= 10),
  evidence_refs JSONB DEFAULT '[]'::jsonb,
  detector_type TEXT NOT NULL DEFAULT 'deterministic',
  check_status TEXT NOT NULL DEFAULT 'COMPLETED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports Table (Unified draft & finalized)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id) UNIQUE NOT NULL,
  pipeline_run_id UUID,
  subject_employee_id UUID REFERENCES users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  overall_confidence NUMERIC(3,2) DEFAULT 0.0,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_version TEXT DEFAULT 'synthesis_v1',
  finalized_by UUID REFERENCES users(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Log Table (Immutable, append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id),
  pipeline_run_id UUID,
  claim_id UUID,
  actor_id UUID,
  actor_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent Runs Table
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY,
  pipeline_run_id UUID,
  review_cycle_id UUID REFERENCES review_cycles(id),
  agent_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  input_ref TEXT,
  output_ref TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Operations Queue Table
CREATE TABLE IF NOT EXISTS operations_queue (
  id UUID PRIMARY KEY,
  review_id UUID REFERENCES review_cycles(id) NOT NULL,
  pipeline_run_id UUID,
  failed_stage TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  retry_count INT DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
