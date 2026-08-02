export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type UserRole = 'OWNER' | 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SYSTEM';

export type FeedbackSource = 
  | 'SELF_ASSESSMENT' 
  | 'PEER_FEEDBACK' 
  | 'MANAGER_FEEDBACK' 
  | 'GOALS' 
  | 'PROJECT_OUTCOMES' 
  | 'MEETING_NOTES';

export type PipelineStage = 
  | 'COLLECTOR' 
  | 'RETRIEVAL' 
  | 'BIAS' 
  | 'SYNTHESIS' 
  | 'GOVERNANCE' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'ESCALATED';

export type ReviewStatus = 
  | 'DRAFT' 
  | 'COLLECTING_FEEDBACK' 
  | 'READY_FOR_AI' 
  | 'PIPELINE_RUNNING' 
  | 'HUMAN_REVIEW' 
  | 'FINALIZED' 
  | 'ESCALATED' 
  | 'FAILED';

export interface EvidenceReference {
  evidence_id: string;
  text_excerpt: string;
}

export type ConfidenceScore = number;

export interface Actor {
  actor_type: 'agent' | 'human';
  actor_id: string;
}
