import { Actor } from './common.js';

export interface AuditLogEntry {
  schema_version?: '1.0';
  log_id?: string;
  id?: string;
  report_id?: string;
  review_cycle_id?: string;
  claim_id?: string | null;
  actor_id?: string | null;
  actor_type?: string;
  created_at?: string;
  event_type: 'agent_run' | 'human_decision' | 'redaction' | 'finalization' | 'SIGNUP' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'EMAIL_VERIFIED' | 'PASSWORD_RESET_REQUESTED' | 'PASSWORD_RESET_COMPLETED' | 'LOGOUT' | 'PASSWORD_CHANGED';
  actor?: Actor;
  timestamp?: string;
  before_state?: Record<string, any> | null;
  after_state?: Record<string, any> | null;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AgentRunRecord {
  id: string;
  agent_name: string;
  pipeline_run_id?: string;
  review_cycle_id?: string;
  input_ref: string;
  output_ref: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'RETRY' | 'ESCALATED';
  confidence?: number;
  duration_ms?: number;
  started_at: string;
  ended_at?: string | null;
  retry_count: number;
}
