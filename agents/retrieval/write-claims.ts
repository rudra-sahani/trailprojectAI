import { v4 as uuidv4 } from 'uuid';
import { claimsRepository } from '../../backend/repositories/db.js';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { ClaimCandidateSchema } from '../../shared/schemas/index.js';

export async function writeClaimCandidate(payload: {
  review_id?: string;
  subject_employee_id: string;
  theme: string;
  evidence_ids: string[];
  source_count: number;
  role_diversity: { self: number; peer: number; manager: number };
  coverage_confidence: number;
  status: 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE';
  summary?: string;
}): Promise<ClaimCandidate> {
  const candidate: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    review_id: payload.review_id,
    subject_employee_id: payload.subject_employee_id,
    theme: payload.theme,
    evidence_ids: payload.evidence_ids,
    source_count: payload.source_count,
    role_diversity: payload.role_diversity,
    coverage_confidence: payload.coverage_confidence,
    status: payload.status,
    summary: payload.summary
  };

  ClaimCandidateSchema.parse(candidate);
  return await claimsRepository.create(candidate, payload.review_id);
}
