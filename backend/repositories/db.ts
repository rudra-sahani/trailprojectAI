import { v4 as uuidv4 } from 'uuid';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { DraftReport, FinalReport } from '../../shared/types/reports.js';
import { AuditLogEntry, AgentRunRecord } from '../../shared/types/audit.js';

import { query, withTransaction, withRlsTransaction } from './pg-client.js';
import { usersRepository } from './users.repository.js';
import { authRepository } from './auth.repository.js';
import { departmentsRepository } from './departments.repository.js';
import { teamsRepository } from './teams.repository.js';
import { reviewsRepository } from './reviews.repository.js';
import { feedbackRepository } from './feedback.repository.js';
import { evidenceRepository } from './evidence.repository.js';
import { claimsRepository } from './claims.repository.js';
import { biasRepository } from './bias.repository.js';
import { reportsRepository } from './reports.repository.js';
import { auditRepository } from './audit.repository.js';
import { agentRunsRepository } from './agent-runs.repository.js';
import { notificationsRepository } from './notifications.repository.js';
import { operationsQueueRepository } from './operations-queue.repository.js';
import { organizationRepository } from './organization.repository.js';
import { invitationRepository } from './invitation.repository.js';
import { designationsRepository } from './designations.repository.js';

export interface DbUser extends UserProfile {
  password_hash?: string;
}

export interface UserCredential {
  userId: string;
  email: string;
  passwordHash: string;
  salt: string;
  isEmailVerified: boolean;
  updatedAt: string;
}

export interface EmailVerificationRecord {
  id: string;
  userId: string;
  email: string;
  code: string;
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
  expiresAt: string;
  usedAt?: string | null;
  createdAt: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

export interface LoginAttemptRecord {
  email: string;
  failedCount: number;
  lockedUntil?: string | null;
}

export interface DbDepartment {
  id: string;
  name: string;
  description?: string | null;
  organization_id?: string | null;
  head_id?: string | null;
  is_archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DbTeam {
  id: string;
  department_id?: string | null;
  manager_id?: string | null;
  name: string;
  description?: string | null;
  organization_id?: string | null;
  is_archived?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DbReviewCycle {
  id: string;
  employee_id: string;
  manager_id: string;
  review_period: string;
  status: 'DRAFT' | 'COLLECTING_FEEDBACK' | 'READY_FOR_AI' | 'PIPELINE_RUNNING' | 'HUMAN_REVIEW' | 'FINALIZED' | 'ESCALATED' | 'FAILED';
  pipeline_stage?: string;
  started_at?: string | null;
  finalized_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRawFeedback {
  id: string;
  review_id: string;
  submitted_by: string;
  source_type: string;
  title?: string;
  content: string;
  submitted_at: string;
  created_at: string;
}

export interface DbOperationsQueue {
  id: string;
  review_id: string;
  pipeline_run_id?: string;
  failed_stage: string;
  failure_reason: string;
  retry_count: number;
  assigned_to?: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'RETRYING' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  resolved_at?: string | null;
}

// PostgreSQL Production Database Facade with zero in-memory arrays
class DatabaseStore {
  // Repositories
  usersRepo = usersRepository;
  authRepo = authRepository;
  departmentsRepo = departmentsRepository;
  teamsRepo = teamsRepository;
  reviewsRepo = reviewsRepository;
  feedbackRepo = feedbackRepository;
  evidenceRepo = evidenceRepository;
  claimsRepo = claimsRepository;
  biasRepo = biasRepository;
  reportsRepo = reportsRepository;
  auditRepo = auditRepository;
  agentRunsRepo = agentRunsRepository;
  notificationsRepo = notificationsRepository;
  operationsQueueRepo = operationsQueueRepository;
  organizationRepo = organizationRepository;
  invitationRepo = invitationRepository;

  // Login Attempts Facade
  loginAttempts = {
    get: async (email: string) => authRepository.getLoginAttempt(email),
    set: async (email: string, record: LoginAttemptRecord) => {
      await authRepository.recordFailedLogin(email, record.failedCount, record.lockedUntil);
    },
    delete: async (email: string) => {
      await authRepository.resetLoginAttempts(email);
    }
  };

  // Transaction Helpers
  withTransaction = withTransaction;
  withRlsTransaction = withRlsTransaction;

  // Immutable Audit Log Rule: NO UPDATE, NO DELETE
  async addAuditEntry(entry: AuditLogEntry): Promise<AuditLogEntry> {
    return auditRepository.addEntry(entry);
  }

  async getAuditLogs(reviewId?: string): Promise<AuditLogEntry[]> {
    return auditRepository.findByReviewId(reviewId);
  }

  async addAgentRun(record: AgentRunRecord): Promise<AgentRunRecord> {
    const run = await agentRunsRepository.create(record);
    await this.addAuditEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: record.review_cycle_id || '',
      review_cycle_id: record.review_cycle_id,
      claim_id: null,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: record.agent_name },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: record.status },
      details: { input_ref: record.input_ref, output_ref: record.output_ref }
    });
    return run;
  }
}

export const db = new DatabaseStore();

export {
  query,
  withTransaction,
  withRlsTransaction,
  usersRepository,
  authRepository,
  departmentsRepository,
  teamsRepository,
  reviewsRepository,
  feedbackRepository,
  evidenceRepository,
  claimsRepository,
  biasRepository,
  reportsRepository,
  auditRepository,
  agentRunsRepository,
  notificationsRepository,
  operationsQueueRepository,
  organizationRepository,
  invitationRepository,
  designationsRepository
};
