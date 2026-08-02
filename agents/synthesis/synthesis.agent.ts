import { v4 as uuidv4 } from 'uuid';
import {
  claimsRepository,
  biasRepository,
  evidenceRepository,
  reportsRepository,
  reviewsRepository,
  agentRunsRepository,
  auditRepository,
  operationsQueueRepository
} from '../../backend/repositories/db.js';
import { generateGroundedSynthesisWithGemini, SynthesisOptions } from './eval-gemini-synthesis.js';
import { validateDraftReport } from './validate-draft.js';
import { calculateOverallConfidence } from './aggregate-confidence.js';
import { DraftReport, ReportSection } from '../../shared/types/reports.js';
import { DraftReportSchema } from '../../shared/schemas/index.js';

export async function processSynthesisJob(
  reviewCycleId: string,
  subjectEmployeeId: string,
  options?: SynthesisOptions
): Promise<DraftReport> {
  const startTime = Date.now();
  let retryCount = 0;

  // 1. Fetch Inputs from Repositories
  const claims = await claimsRepository.findByReviewId(reviewCycleId);
  const flags = await biasRepository.findByReviewId(reviewCycleId);
  const evidenceNodes = await evidenceRepository.findByReviewId(reviewCycleId);

  // 2. Execute Gemini Synthesis with 1 Retry
  let sections: ReportSection[] = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 1; attempt++) {
    retryCount = attempt;
    try {
      sections = await generateGroundedSynthesisWithGemini(claims, evidenceNodes, flags, options);
      validateDraftReport(sections);
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Synthesis Agent] Attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  // 3. Failure Recovery & Escalation if Gemini fails twice
  if (lastError) {
    const duration_ms = Date.now() - startTime;

    if (reviewCycleId) {
      try {
        await reviewsRepository.updateStatus(reviewCycleId, 'ESCALATED', 'FAILED');
      } catch {}
    }

    const opId = uuidv4();
    await operationsQueueRepository.create({
      id: opId,
      review_id: reviewCycleId,
      failed_stage: 'SYNTHESIS',
      failure_reason: lastError.message,
      retry_count: 2,
      assigned_to: null,
      status: 'OPEN',
      created_at: new Date().toISOString()
    });

    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Synthesis',
      review_cycle_id: reviewCycleId,
      input_ref: claims.map(c => c.claim_id).join(',') || reviewCycleId,
      output_ref: opId,
      status: 'FAILED',
      confidence: 0,
      duration_ms,
      started_at: new Date(startTime).toISOString(),
      ended_at: new Date().toISOString(),
      retry_count: 2
    });

    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: subjectEmployeeId,
      review_cycle_id: reviewCycleId,
      claim_id: null,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: 'Synthesis' },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: 'FAILED', stage: 'SYNTHESIS' },
      details: { error: lastError.message, retry_count: 2 }
    });

    throw lastError;
  }

  // 4. Calculate Confidence and Prepare Draft Report
  const overallConfidence = calculateOverallConfidence(sections);
  const reportId = uuidv4();

  const draft: DraftReport = {
    schema_version: '1.0',
    report_id: reportId,
    subject_employee_id: subjectEmployeeId,
    review_cycle_id: reviewCycleId,
    review_id: reviewCycleId,
    generated_at: new Date().toISOString(),
    sections,
    overall_confidence: overallConfidence,
    prompt_version: 'synthesis_v2'
  };

  // 5. Schema Validation & Repository Persistence
  DraftReportSchema.parse(draft);
  await reportsRepository.saveOrUpdate(draft);
  await reviewsRepository.updateStatus(reviewCycleId, 'HUMAN_REVIEW', 'SYNTHESIS');

  const duration_ms = Date.now() - startTime;

  // 6. Record Agent Run & Immutable Audit Log
  await agentRunsRepository.create({
    id: uuidv4(),
    agent_name: 'Synthesis',
    review_cycle_id: reviewCycleId,
    input_ref: claims.map(c => c.claim_id).join(',') || reviewCycleId,
    output_ref: reportId,
    status: 'SUCCEEDED',
    confidence: overallConfidence,
    duration_ms,
    started_at: new Date(startTime).toISOString(),
    ended_at: new Date().toISOString(),
    retry_count: retryCount
  });

  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    report_id: reportId,
    review_cycle_id: reviewCycleId,
    claim_id: null,
    event_type: 'agent_run' as any,
    actor: { actor_type: 'agent', actor_id: 'Synthesis' },
    timestamp: new Date().toISOString(),
    before_state: null,
    after_state: { status: 'DRAFT_GENERATED', report_id: reportId },
    details: { duration_ms, confidence: overallConfidence, retry_count: retryCount, prompt_version: 'synthesis_v2' }
  });

  return draft;
}
