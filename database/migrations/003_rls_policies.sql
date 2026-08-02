-- Migration: 003_rls_policies.sql
-- Description: Enable Row Level Security (RLS) and define access policies for VeriReview AI
-- Author: VeriReview AI Production Pipeline
-- Justification: Implements database-enforced security policies per DATABASE.md for EMPLOYEE, MANAGER, HR_ADMIN, and SYSTEM roles.

-- 1. Enable RLS on all relational tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE revoked_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- 2. Define standard RLS policies based on app.current_user_id and app.current_user_role session settings

-- USERS Table
DROP POLICY IF EXISTS users_select_policy ON users;
CREATE POLICY users_select_policy ON users FOR SELECT USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  OR (
    current_setting('app.current_user_role', true) = 'MANAGER'
    AND team_id IN (SELECT id FROM teams WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
  )
);

DROP POLICY IF EXISTS users_all_admin_policy ON users;
CREATE POLICY users_all_admin_policy ON users FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
);

-- DEPARTMENTS & TEAMS (Readable by all authenticated users, writable by HR_ADMIN/SYSTEM)
DROP POLICY IF EXISTS departments_select_policy ON departments;
CREATE POLICY departments_select_policy ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS departments_admin_policy ON departments;
CREATE POLICY departments_admin_policy ON departments FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
);

DROP POLICY IF EXISTS teams_select_policy ON teams;
CREATE POLICY teams_select_policy ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS teams_admin_policy ON teams;
CREATE POLICY teams_admin_policy ON teams FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
);

-- REVIEW CYCLES Table
DROP POLICY IF EXISTS review_cycles_policy ON review_cycles;
CREATE POLICY review_cycles_policy ON review_cycles FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR employee_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  OR manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
);

-- RAW FEEDBACK Table
DROP POLICY IF EXISTS raw_feedback_policy ON raw_feedback;
CREATE POLICY raw_feedback_policy ON raw_feedback FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR submitted_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  OR review_id IN (
    SELECT id FROM review_cycles
    WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
);

-- EVIDENCE NODES Table
DROP POLICY IF EXISTS evidence_nodes_policy ON evidence_nodes;
CREATE POLICY evidence_nodes_policy ON evidence_nodes FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR author_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  OR review_id IN (
    SELECT id FROM review_cycles
    WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
);

-- CLAIM CANDIDATES Table
DROP POLICY IF EXISTS claim_candidates_policy ON claim_candidates;
CREATE POLICY claim_candidates_policy ON claim_candidates FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR review_id IN (
    SELECT id FROM review_cycles
    WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
);

-- BIAS FLAGS Table
DROP POLICY IF EXISTS bias_flags_policy ON bias_flags;
CREATE POLICY bias_flags_policy ON bias_flags FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR review_id IN (
    SELECT id FROM review_cycles
    WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
);

-- REPORTS Table
DROP POLICY IF EXISTS reports_policy ON reports;
CREATE POLICY reports_policy ON reports FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR review_id IN (
    SELECT id FROM review_cycles
    WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
  OR (
    subject_employee_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    AND status = 'FINALIZED'
  )
);

-- AUDIT LOG Table (Read permitted per role, INSERT permitted, NO UPDATE / NO DELETE)
DROP POLICY IF EXISTS audit_log_select_policy ON audit_log;
CREATE POLICY audit_log_select_policy ON audit_log FOR SELECT USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR review_id IN (
    SELECT id FROM review_cycles
    WHERE manager_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
       OR employee_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
);

DROP POLICY IF EXISTS audit_log_insert_policy ON audit_log;
CREATE POLICY audit_log_insert_policy ON audit_log FOR INSERT WITH CHECK (true);

-- AGENT RUNS Table
DROP POLICY IF EXISTS agent_runs_policy ON agent_runs;
CREATE POLICY agent_runs_policy ON agent_runs FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
);

-- NOTIFICATIONS Table
DROP POLICY IF EXISTS notifications_policy ON notifications;
CREATE POLICY notifications_policy ON notifications FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
  OR user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
);

-- OPERATIONS QUEUE Table
DROP POLICY IF EXISTS operations_queue_policy ON operations_queue;
CREATE POLICY operations_queue_policy ON operations_queue FOR ALL USING (
  current_setting('app.current_user_role', true) IN ('HR_ADMIN', 'SYSTEM')
);

-- AUTH TABLES Policies
DROP POLICY IF EXISTS user_credentials_policy ON user_credentials;
CREATE POLICY user_credentials_policy ON user_credentials FOR ALL USING (true);

DROP POLICY IF EXISTS email_verifications_policy ON email_verifications;
CREATE POLICY email_verifications_policy ON email_verifications FOR ALL USING (true);

DROP POLICY IF EXISTS refresh_tokens_policy ON refresh_tokens;
CREATE POLICY refresh_tokens_policy ON refresh_tokens FOR ALL USING (true);

DROP POLICY IF EXISTS revoked_tokens_policy ON revoked_access_tokens;
CREATE POLICY revoked_tokens_policy ON revoked_access_tokens FOR ALL USING (true);

DROP POLICY IF EXISTS login_attempts_policy ON login_attempts;
CREATE POLICY login_attempts_policy ON login_attempts FOR ALL USING (true);
