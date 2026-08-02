import { FeedbackSource } from '../../shared/types/common.js';

export function mapSourceTypeToEvidenceSource(sourceType: FeedbackSource | string): 'self_assessment' | 'peer_feedback' | 'manager_feedback' | 'goal' | 'project_outcome' | 'meeting_note' {
  const upper = String(sourceType).toUpperCase();
  switch (upper) {
    case 'SELF_ASSESSMENT':
    case 'SELF':
      return 'self_assessment';
    case 'PEER_FEEDBACK':
    case 'PEER':
      return 'peer_feedback';
    case 'MANAGER_FEEDBACK':
    case 'MANAGER':
      return 'manager_feedback';
    case 'GOALS':
    case 'GOAL':
      return 'goal';
    case 'PROJECT_OUTCOMES':
    case 'PROJECT_OUTCOME':
      return 'project_outcome';
    case 'MEETING_NOTES':
    case 'MEETING_NOTE':
      return 'meeting_note';
    default:
      if (['self_assessment', 'peer_feedback', 'manager_feedback', 'goal', 'project_outcome', 'meeting_note'].includes(sourceType)) {
        return sourceType as any;
      }
      return 'self_assessment';
  }
}

export function tagMetadata(input: {
  source_type: FeedbackSource | string;
  author_role: 'self' | 'peer' | 'manager';
  author_id: string | null;
  submitted_at: string;
}) {
  return {
    source_type: mapSourceTypeToEvidenceSource(input.source_type),
    author_role: input.author_role,
    author_id: input.author_id,
    submitted_at: input.submitted_at || new Date().toISOString()
  };
}
