import { v4 as uuidv4 } from 'uuid';
import { validateCollectorInput, CollectorInput } from './validate-input.js';
import { segmentTextIntoUnits } from './segment.js';
import { tagMetadata } from './tag-metadata.js';
import { writeEvidenceNode } from './write-evidence.js';
import { recordRejectedInput } from './reject-invalid.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import {
  agentRunsRepository,
  auditRepository,
  operationsQueueRepository,
  reviewsRepository
} from '../../backend/repositories/db.js';

export async function processCollectorJob(input: any): Promise<EvidenceNode[]> {
  const startTime = Date.now();
  let retryCount = 0;
  let validatedInput: CollectorInput;
  let meta: ReturnType<typeof tagMetadata>;

  // 1. Input Validation
  try {
    validatedInput = validateCollectorInput(input);
    meta = tagMetadata(validatedInput);
  } catch (err: any) {
    const duration_ms = Date.now() - startTime;
    await recordRejectedInput({
      review_id: input?.review_id,
      subject_employee_id: input?.subject_employee_id,
      source_type: input?.source_type,
      author_role: input?.author_role,
      author_id: input?.author_id,
      text_unit: input?.raw_text,
      rejection_reason: err.message || 'ERR_COLLECTOR_INVALID_INPUT'
    });

    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Collector',
      review_cycle_id: input?.review_id || '',
      input_ref: input?.raw_feedback_id || 'input',
      output_ref: 'rejected',
      status: 'FAILED',
      confidence: 0,
      duration_ms,
      started_at: new Date(startTime).toISOString(),
      ended_at: new Date().toISOString(),
      retry_count: 0
    });

    throw err;
  }

  // 2. Gemini Segmentation with 1 Retry
  let textUnits: Array<{ text_unit: string; tags: string[] }> = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 1; attempt++) {
    retryCount = attempt;
    try {
      textUnits = await segmentTextIntoUnits(validatedInput.raw_text, {
        source_type: meta.source_type,
        author_role: meta.author_role,
        simulateFailure: Boolean(input?.simulateFailure)
      });
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Collector Agent] Attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  // 3. Failure Recovery & Escalation if Gemini fails twice
  if (lastError || textUnits.length === 0) {
    const geminiErr = lastError || new Error('ERR_COLLECTOR_ZERO_UNITS: Gemini produced 0 text units');
    const duration_ms = Date.now() - startTime;
    const reviewId = validatedInput.review_id;

    // Mark review cycle as ESCALATED
    if (reviewId) {
      try {
        await reviewsRepository.updateStatus(reviewId, 'ESCALATED', 'FAILED');
      } catch {
        // ignore review status update errors
      }
    }

    // Record in operations queue
    const opId = uuidv4();
    await operationsQueueRepository.create({
      id: opId,
      review_id: reviewId,
      failed_stage: 'COLLECTOR',
      failure_reason: geminiErr.message,
      retry_count: 2,
      assigned_to: null,
      status: 'OPEN',
      created_at: new Date().toISOString()
    });

    // Log failed agent run
    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Collector',
      review_cycle_id: reviewId,
      input_ref: validatedInput.raw_feedback_id || 'input',
      output_ref: opId,
      status: 'FAILED',
      confidence: 0,
      duration_ms,
      started_at: new Date(startTime).toISOString(),
      ended_at: new Date().toISOString(),
      retry_count: 2
    });

    // Audit event for failure
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: validatedInput.subject_employee_id,
      review_cycle_id: reviewId,
      claim_id: null,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: 'Collector' },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: 'FAILED', stage: 'COLLECTOR' },
      details: { error: geminiErr.message, retry_count: 2 }
    });

    // Record rejected input
    await recordRejectedInput({
      review_id: reviewId,
      subject_employee_id: validatedInput.subject_employee_id,
      source_type: meta.source_type,
      author_role: meta.author_role,
      author_id: meta.author_id,
      text_unit: validatedInput.raw_text,
      rejection_reason: `ERR_COLLECTOR_GEMINI_FAILURE: ${geminiErr.message}`
    });

    throw geminiErr;
  }

  // 4. Evidence Persistence
  const createdNodes: EvidenceNode[] = [];
  for (const unit of textUnits) {
    const node = await writeEvidenceNode({
      review_id: validatedInput.review_id,
      raw_feedback_id: validatedInput.raw_feedback_id,
      subject_employee_id: validatedInput.subject_employee_id,
      source_type: meta.source_type,
      author_role: meta.author_role,
      author_id: meta.author_id,
      submitted_at: meta.submitted_at,
      text_unit: unit.text_unit,
      tags: unit.tags
    });
    createdNodes.push(node);
  }

  const duration_ms = Date.now() - startTime;
  const confidence = 0.95;

  // 5. Successful Execution Tracking & Audit Logging
  await agentRunsRepository.create({
    id: uuidv4(),
    agent_name: 'Collector',
    review_cycle_id: validatedInput.review_id,
    input_ref: validatedInput.raw_feedback_id || 'input',
    output_ref: createdNodes.map(n => n.evidence_id).join(','),
    status: 'SUCCEEDED',
    confidence,
    duration_ms,
    started_at: new Date(startTime).toISOString(),
    ended_at: new Date().toISOString(),
    retry_count: retryCount
  });

  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    report_id: validatedInput.subject_employee_id,
    review_cycle_id: validatedInput.review_id,
    claim_id: null,
    event_type: 'agent_run' as any,
    actor: { actor_type: 'agent', actor_id: 'Collector' },
    timestamp: new Date().toISOString(),
    before_state: null,
    after_state: { status: 'SUCCEEDED', evidence_count: createdNodes.length },
    details: { duration_ms, confidence, retry_count: retryCount }
  });

  return createdNodes;
}
