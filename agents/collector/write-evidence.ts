import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { evidenceRepository } from '../../backend/repositories/db.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { EvidenceNodeSchema } from '../../shared/schemas/index.js';

function toUuid(id: string | null | undefined): string {
  if (id) {
    try {
      EvidenceNodeSchema.shape.subject_employee_id.parse(id);
      return id;
    } catch {
      // fallback to generated uuid
    }
  }
  return uuidv4();
}

function toNullableUuid(id: string | null | undefined): string | null {
  if (!id) return null;
  try {
    EvidenceNodeSchema.shape.subject_employee_id.parse(id);
    return id;
  } catch {
    return null;
  }
}

export async function writeEvidenceNode(payload: {
  review_id: string;
  raw_feedback_id?: string;
  subject_employee_id: string;
  source_type: 'self_assessment' | 'peer_feedback' | 'manager_feedback' | 'goal' | 'project_outcome' | 'meeting_note';
  author_role: 'self' | 'peer' | 'manager';
  author_id: string | null;
  submitted_at: string;
  text_unit: string;
  tags: string[];
}): Promise<EvidenceNode> {
  const truncatedText = payload.text_unit.slice(0, 1999);

  const node: EvidenceNode = {
    schema_version: '1.0',
    evidence_id: uuidv4(),
    review_id: payload.review_id,
    raw_feedback_id: payload.raw_feedback_id,
    subject_employee_id: toUuid(payload.subject_employee_id),
    source_type: payload.source_type,
    author_role: payload.author_role || 'self',
    author_id: toNullableUuid(payload.author_id),
    submitted_at: payload.submitted_at || new Date().toISOString(),
    text_unit: truncatedText,
    tags: payload.tags && payload.tags.length > 0 ? payload.tags : ['general'],
    status: 'ACCEPTED',
    rejection_reason: null
  };

  EvidenceNodeSchema.parse(node);

  return await evidenceRepository.create(node, payload.review_id);
}
