export interface ReportClaim {
  claim_id: string;
  text: string;
  evidence_ids: string[];
  bias_flags: string[];
  confidence: number;
  reviewer_decision: 'PENDING' | 'REQUIRES_HUMAN_REVIEW' | 'ACCEPTED' | 'EDITED' | 'REJECTED';
  reviewer_edit_text: string | null;
  reviewer_comment?: string | null;
}

export interface ReportSection {
  section_type: 'strengths' | 'growth_areas' | 'impact_highlights' | 'goal_progress';
  claims: ReportClaim[];
}

export interface DraftReport {
  schema_version: '1.0';
  report_id: string;
  subject_employee_id?: string;
  review_cycle_id?: string;
  review_id?: string;
  generated_at?: string;
  sections: ReportSection[];
  overall_confidence?: number;
  prompt_version?: string;
  status?: string;
  finalized_at?: string;
  finalized_by?: string;
}

export interface FinalReport {
  schema_version: '1.0';
  report_id: string;
  subject_employee_id?: string;
  review_cycle_id?: string;
  review_id?: string;
  status: 'FINALIZED' | 'DRAFT';
  finalized_at: string;
  finalized_by: string;
  sections: ReportSection[];
  overall_confidence?: number;
}
