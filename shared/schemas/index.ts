import { z } from 'zod';
import { validateSchemaVersion } from './version-guard.js';

export * from './version-guard.js';

export const EvidenceNodeSchema = z.object({
  schema_version: z.literal('1.0'),
  evidence_id: z.string().uuid(),
  subject_employee_id: z.string().uuid(),
  source_type: z.enum([
    'self_assessment',
    'peer_feedback',
    'manager_feedback',
    'goal',
    'project_outcome',
    'meeting_note'
  ]),
  author_role: z.enum(['self', 'peer', 'manager']),
  author_id: z.string().uuid().nullable(),
  submitted_at: z.string(),
  text_unit: z.string().min(1).max(2000),
  tags: z.array(z.string()),
  status: z.enum(['ACCEPTED', 'REJECTED']),
  rejection_reason: z.string().nullable()
});

export const ClaimCandidateSchema = z.object({
  schema_version: z.literal('1.0'),
  claim_id: z.string().uuid(),
  subject_employee_id: z.string().uuid(),
  theme: z.string().min(1),
  evidence_ids: z.array(z.string().uuid()),
  source_count: z.number().int().min(0),
  role_diversity: z.object({
    self: z.number().int().min(0),
    peer: z.number().int().min(0),
    manager: z.number().int().min(0)
  }),
  coverage_confidence: z.number().min(0).max(1),
  status: z.enum(['SUFFICIENT', 'INSUFFICIENT_EVIDENCE']),
  summary: z.string().optional()
}).refine(data => {
  if (data.status === 'SUFFICIENT' && data.evidence_ids.length === 0) {
    return false;
  }
  if (data.coverage_confidence < 0.3 && data.status === 'SUFFICIENT') {
    return false;
  }
  return true;
}, {
  message: 'Claim candidate with status SUFFICIENT must have at least one evidence_id and coverage_confidence >= 0.3'
});

export const BiasFlagSchema = z.object({
  schema_version: z.literal('1.0'),
  flag_id: z.string().uuid(),
  claim_id: z.string().uuid(),
  flag_type: z.enum([
    'source_imbalance',
    'recency_weighted',
    'sentiment_extremity',
    'unsupported_claim'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  explanation: z.string().min(10).refine((exp) => {
    // Must contain a concrete number, date, or count reference
    return /\d/.test(exp) || /Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|month|year/i.test(exp);
  }, {
    message: 'Bias explanation must reference concrete numbers, counts, or dates'
  }),
  evidence_refs: z.array(z.string()),
  detector_type: z.enum(['deterministic', 'llm_assisted']),
  check_status: z.enum(['COMPLETED', 'CHECK_UNAVAILABLE'])
});

export const ReportClaimSchema = z.object({
  claim_id: z.string().uuid(),
  text: z.string().min(1),
  evidence_ids: z.array(z.string().uuid()).min(1, 'Every claim must have at least one evidence_id'),
  bias_flags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reviewer_decision: z.enum(['PENDING', 'REQUIRES_HUMAN_REVIEW', 'ACCEPTED', 'EDITED', 'REJECTED']),
  reviewer_edit_text: z.string().nullable(),
  reviewer_comment: z.string().nullable().optional()
});

export const ReportSectionSchema = z.object({
  section_type: z.enum(['strengths', 'growth_areas', 'impact_highlights', 'goal_progress']),
  claims: z.array(ReportClaimSchema)
});

export const DraftReportSchema = z.object({
  schema_version: z.literal('1.0'),
  report_id: z.string().uuid(),
  subject_employee_id: z.string().uuid(),
  review_cycle_id: z.string().uuid(),
  generated_at: z.string(),
  sections: z.array(ReportSectionSchema),
  overall_confidence: z.number().min(0).max(1),
  prompt_version: z.string().optional()
});

export const FinalReportSchema = z.object({
  schema_version: z.literal('1.0'),
  report_id: z.string().uuid(),
  status: z.literal('FINALIZED'),
  finalized_at: z.string(),
  finalized_by: z.string(),
  sections: z.array(ReportSectionSchema)
}).refine(data => {
  for (const sec of data.sections) {
    for (const claim of sec.claims) {
      if (claim.reviewer_decision === 'PENDING') {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'Cannot finalize report while any claim decision is PENDING'
});

export const AuditLogEntrySchema = z.object({
  schema_version: z.literal('1.0'),
  log_id: z.string().uuid(),
  report_id: z.string(),
  review_cycle_id: z.string().optional(),
  claim_id: z.string().nullable(),
  event_type: z.enum(['agent_run', 'human_decision', 'redaction', 'finalization']),
  actor: z.object({
    actor_type: z.enum(['agent', 'human']),
    actor_id: z.string()
  }),
  timestamp: z.string(),
  before_state: z.record(z.string(), z.any()).nullable(),
  after_state: z.record(z.string(), z.any()).nullable(),
  details: z.record(z.string(), z.any()).optional()
});
