import { FeedbackSource } from '../../shared/types/common.js';

export interface CollectorInput {
  raw_feedback_id?: string;
  review_id: string;
  subject_employee_id: string;
  source_type: FeedbackSource | string;
  author_role: 'self' | 'peer' | 'manager';
  author_id: string | null;
  submitted_at: string;
  raw_text: string;
  simulateFailure?: boolean;
}

const VALID_SOURCES = new Set([
  'SELF_ASSESSMENT', 'PEER_FEEDBACK', 'MANAGER_FEEDBACK', 'GOALS', 'PROJECT_OUTCOMES', 'MEETING_NOTES',
  'self_assessment', 'peer_feedback', 'manager_feedback', 'goal', 'project_outcome', 'meeting_note'
]);

export function validateCollectorInput(input: any): CollectorInput {
  if (!input || typeof input !== 'object') {
    throw new Error('ERR_COLLECTOR_EMPTY_INPUT: Input payload is required');
  }
  if (!input.review_id || typeof input.review_id !== 'string' || input.review_id.trim() === '') {
    throw new Error('ERR_COLLECTOR_MISSING_REVIEW_ID: review_id is required');
  }
  if (!input.subject_employee_id || typeof input.subject_employee_id !== 'string' || input.subject_employee_id.trim() === '') {
    throw new Error('ERR_COLLECTOR_UNKNOWN_EMPLOYEE: subject_employee_id is required');
  }
  if (!input.source_type || !VALID_SOURCES.has(String(input.source_type))) {
    throw new Error(`ERR_COLLECTOR_INVALID_SOURCE_TYPE: source_type '${input.source_type}' is invalid`);
  }
  if (!input.raw_text || typeof input.raw_text !== 'string' || input.raw_text.trim() === '') {
    throw new Error('ERR_COLLECTOR_EMPTY_TEXT: raw_text must be non-empty string');
  }
  return input as CollectorInput;
}
