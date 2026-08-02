import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { evidenceRepository, auditRepository } from '../../backend/repositories/db.js';
import { EvidenceNode } from '../../shared/types/evidence.js';

function toUuid(id: string | null | undefined): string {
  if (id && uuidValidate(id)) return id;
  return uuidv4();
}

export async function recordRejectedInput(payload: {
  review_id?: string;
  subject_employee_id?: string;
  source_type?: any;
  author_role?: any;
  author_id?: string | null;
  text_unit?: string;
  rejection_reason: string;
}): Promise<EvidenceNode> {
  const rejectedNode: EvidenceNode = {
    schema_version: '1.0',
    evidence_id: uuidv4(),
    review_id: payload.review_id,
    subject_employee_id: toUuid(payload.subject_employee_id),
    source_type: payload.source_type || 'self_assessment',
    author_role: payload.author_role || 'self',
    author_id: payload.author_id && uuidValidate(payload.author_id) ? payload.author_id : null,
    submitted_at: new Date().toISOString(),
    text_unit: payload.text_unit ? payload.text_unit.slice(0, 1999) : '[MALFORMED_INPUT]',
    tags: ['rejected'],
    status: 'REJECTED',
    rejection_reason: payload.rejection_reason
  };

  const created = await evidenceRepository.create(rejectedNode, payload.review_id);

  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    report_id: rejectedNode.subject_employee_id,
    review_cycle_id: payload.review_id,
    claim_id: null,
    event_type: 'agent_run' as any,
    actor: { actor_type: 'agent', actor_id: 'Collector' },
    timestamp: new Date().toISOString(),
    before_state: null,
    after_state: { status: 'REJECTED', rejection_reason: payload.rejection_reason },
    details: { text_unit: payload.text_unit }
  });

  return created;
}
