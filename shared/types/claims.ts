export interface ClaimCandidate {
  schema_version: '1.0';
  claim_id: string;
  review_id?: string;
  subject_employee_id: string;
  theme: string;
  evidence_ids: string[];
  source_count: number;
  role_diversity: { self: number; peer: number; manager: number };
  coverage_confidence: number;
  status: 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE';
  summary?: string;
}
