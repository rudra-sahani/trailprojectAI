import { v4 as uuidv4 } from 'uuid';
import {
  claimsRepository,
  evidenceRepository,
  biasRepository,
  agentRunsRepository,
  auditRepository,
  operationsQueueRepository,
  reviewsRepository
} from '../../backend/repositories/db.js';
import { checkSourceImbalance } from './source-imbalance.js';
import { checkRecencyWeight } from './recency-weight.js';
import { checkUnsupportedClaim } from './unsupported-claim.js';
import { evaluateSemanticBiasWithGemini, EvaluateBiasOptions } from './eval-gemini-bias.js';
import { writeBiasFlag } from './write-flags.js';
import { BiasFlag } from '../../shared/types/bias.js';

export async function processBiasDetectionJob(
  reviewId: string,
  subjectEmployeeId: string,
  options?: EvaluateBiasOptions
): Promise<BiasFlag[]> {
  const startTime = Date.now();
  let retryCount = 0;

  // 1. Fetch claims and evidence nodes for this review cycle
  const claims = await claimsRepository.findByReviewId(reviewId);
  const evidence = await evidenceRepository.findByReviewId(reviewId);

  // If no claims exist, create successful agent_run record and return empty
  if (claims.length === 0) {
    const duration_ms = Date.now() - startTime;

    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Bias Detection',
      review_cycle_id: reviewId,
      input_ref: reviewId,
      output_ref: 'none',
      status: 'SUCCEEDED',
      confidence: 1.0,
      duration_ms,
      started_at: new Date(startTime).toISOString(),
      ended_at: new Date().toISOString(),
      retry_count: 0
    });

    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: subjectEmployeeId,
      review_cycle_id: reviewId,
      claim_id: null,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: 'Bias Detection' },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: 'SUCCEEDED', flags_count: 0 },
      details: { duration_ms, confidence: 1.0, reason: 'No claims found to evaluate' }
    });

    return [];
  }

  // 2. Deterministic Bias Checks
  const deterministicFlags: BiasFlag[] = [];

  for (const claim of claims) {
    // Source Imbalance
    const flagImbalance = checkSourceImbalance(claim);
    if (flagImbalance) deterministicFlags.push(flagImbalance);

    // Recency Weight
    const flagRecency = checkRecencyWeight(claim, evidence);
    if (flagRecency) deterministicFlags.push(flagRecency);

    // Unsupported Claim
    const flagUnsupported = checkUnsupportedClaim(claim);
    if (flagUnsupported) deterministicFlags.push(flagUnsupported);
  }

  // 3. Gemini Semantic Bias Evaluation with 1 Retry (2 Total Attempts)
  let geminiFlags: BiasFlag[] = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 1; attempt++) {
    retryCount = attempt;
    try {
      geminiFlags = await evaluateSemanticBiasWithGemini(claims, evidence, options);
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Bias Detection Agent] Attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  // 4. Failure Recovery & Escalation if Gemini fails twice
  if (lastError) {
    const geminiErr = lastError;
    const duration_ms = Date.now() - startTime;

    // Mark review cycle as ESCALATED
    if (reviewId) {
      try {
        await reviewsRepository.updateStatus(reviewId, 'ESCALATED', 'FAILED');
      } catch {
        // ignore update status error
      }
    }

    // Record in operations queue
    const opId = uuidv4();
    await operationsQueueRepository.create({
      id: opId,
      review_id: reviewId,
      failed_stage: 'BIAS_DETECTION',
      failure_reason: geminiErr.message,
      retry_count: 2,
      assigned_to: null,
      status: 'OPEN',
      created_at: new Date().toISOString()
    });

    // Log failed agent run
    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Bias Detection',
      review_cycle_id: reviewId,
      input_ref: reviewId,
      output_ref: opId,
      status: 'FAILED',
      confidence: 0.0,
      duration_ms,
      started_at: new Date(startTime).toISOString(),
      ended_at: new Date().toISOString(),
      retry_count: 2
    });

    // Audit event for failure
    await auditRepository.addEntry({
      schema_version: '1.0',
      log_id: uuidv4(),
      report_id: subjectEmployeeId,
      review_cycle_id: reviewId,
      claim_id: null,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: 'Bias Detection' },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: 'FAILED', stage: 'BIAS_DETECTION' },
      details: { error: geminiErr.message, retry_count: 2 }
    });

    throw geminiErr;
  }

  // 5. Combine & Deduplicate Generated Flags
  const combinedMap = new Map<string, BiasFlag>();

  // Add deterministic flags
  for (const f of deterministicFlags) {
    const key = `${f.claim_id}:${f.flag_type}`;
    combinedMap.set(key, f);
  }

  // Add gemini flags (overriding if needed or adding unique)
  for (const f of geminiFlags) {
    const key = `${f.claim_id}:${f.flag_type}`;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, f);
    }
  }

  const generatedFlags = Array.from(combinedMap.values());

  // 6. Validate & Persist via biasRepository
  const savedFlags: BiasFlag[] = [];
  for (const flag of generatedFlags) {
    const saved = await writeBiasFlag(flag, reviewId);
    savedFlags.push(saved);
  }

  const duration_ms = Date.now() - startTime;
  const confidence = claims.length > 0 ? 0.95 : 1.0;

  // 7. Record Agent Run & Audit Logging
  await agentRunsRepository.create({
    id: uuidv4(),
    agent_name: 'Bias Detection',
    review_cycle_id: reviewId,
    input_ref: reviewId,
    output_ref: savedFlags.map(f => f.flag_id).join(',') || 'none',
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
    report_id: subjectEmployeeId,
    review_cycle_id: reviewId,
    claim_id: null,
    event_type: 'agent_run' as any,
    actor: { actor_type: 'agent', actor_id: 'Bias Detection' },
    timestamp: new Date().toISOString(),
    before_state: null,
    after_state: { status: 'SUCCEEDED', flags_count: savedFlags.length },
    details: { duration_ms, confidence, retry_count: retryCount }
  });

  return savedFlags;
}
