export interface EvidenceNode {
  schema_version: '1.0';
  evidence_id: string;
  review_id?: string;
  raw_feedback_id?: string;
  title?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  subject_employee_id: string;
  source_type: 'self_assessment' | 'peer_feedback' | 'manager_feedback' | 'goal' | 'project_outcome' | 'meeting_note';
  author_role: 'self' | 'peer' | 'manager';
  author_id: string | null;
  submitted_at: string;
  text_unit: string;
  tags: string[];
  status: 'ACCEPTED' | 'REJECTED';
  rejection_reason: string | null;
}
