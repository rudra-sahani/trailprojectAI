import { v4 as uuidv4 } from 'uuid';
import {
  evidenceRepository,
  claimsRepository,
  agentRunsRepository,
  auditRepository,
  operationsQueueRepository,
  reviewsRepository
} from '../../backend/repositories/db.js';
import { calculateCoverageConfidence } from './score-coverage.js';
import { applyCoverageFloor } from './apply-floor.js';
import { writeClaimCandidate } from './write-claims.js';
import { clusterEvidenceWithGemini, GeminiThemeCluster } from './cluster-evidence.js';
import { ClaimCandidate } from '../../shared/types/claims.js';

export async function processRetrievalJob(
  reviewId: string,
  subjectEmployeeId: string,
  options?: { simulateFailure?: boolean; simulateTimeout?: boolean }
): Promise<ClaimCandidate[]> {
  const startTime = Date.now();
  let retryCount = 0;

  // 1. Fetch & Filter Accepted Evidence Nodes
  const nodes = await evidenceRepository.findByReviewId(reviewId);
  const acceptedNodes = nodes.filter(
    n => (n.subject_employee_id === subjectEmployeeId || !subjectEmployeeId) && n.status === 'ACCEPTED'
  );

  // If no accepted evidence exists, write INSUFFICIENT_EVIDENCE claim and complete successfully
  if (acceptedNodes.length === 0) {
    const duration_ms = Date.now() - startTime;
    const emptyClaim = await writeClaimCandidate({
      review_id: reviewId,
      subject_employee_id: subjectEmployeeId,
      theme: 'Overall Performance & Core Competencies',
      evidence_ids: [],
      source_count: 0,
      role_diversity: { self: 0, peer: 0, manager: 0 },
      coverage_confidence: 0.0,
      status: 'INSUFFICIENT_EVIDENCE',
      summary: 'Insufficient evidence available for this review cycle.'
    });

    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Retrieval',
      review_cycle_id: reviewId,
      input_ref: reviewId,
      output_ref: emptyClaim.claim_id,
      status: 'SUCCEEDED',
      confidence: 0.0,
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
      claim_id: emptyClaim.claim_id,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: 'Retrieval' },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: 'INSUFFICIENT_EVIDENCE', claims_count: 1 },
      details: { duration_ms, confidence: 0.0, reason: 'No accepted evidence nodes found' }
    });

    return [emptyClaim];
  }

  // 2. Gemini Theme Clustering with 1 Retry
  let clusters: GeminiThemeCluster[] = [];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 1; attempt++) {
    retryCount = attempt;
    try {
      clusters = await clusterEvidenceWithGemini(acceptedNodes, {
        simulateFailure: Boolean(options?.simulateFailure),
        simulateTimeout: Boolean(options?.simulateTimeout)
      });
      lastError = null;
      break;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Retrieval Agent] Attempt ${attempt + 1} failed: ${err.message}`);
    }
  }

  // 3. Failure Recovery & Escalation if Gemini fails twice
  if (lastError) {
    const geminiErr = lastError;
    const duration_ms = Date.now() - startTime;

    // Mark review cycle as ESCALATED
    if (reviewId) {
      try {
        await reviewsRepository.updateStatus(reviewId, 'ESCALATED', 'FAILED');
      } catch {
        // ignore status update error
      }
    }

    // Record in operations queue
    const opId = uuidv4();
    await operationsQueueRepository.create({
      id: opId,
      review_id: reviewId,
      failed_stage: 'RETRIEVAL',
      failure_reason: geminiErr.message,
      retry_count: 2,
      assigned_to: null,
      status: 'OPEN',
      created_at: new Date().toISOString()
    });

    // Log failed agent run
    await agentRunsRepository.create({
      id: uuidv4(),
      agent_name: 'Retrieval',
      review_cycle_id: reviewId,
      input_ref: reviewId,
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
      report_id: subjectEmployeeId,
      review_cycle_id: reviewId,
      claim_id: null,
      event_type: 'agent_run' as any,
      actor: { actor_type: 'agent', actor_id: 'Retrieval' },
      timestamp: new Date().toISOString(),
      before_state: null,
      after_state: { status: 'FAILED', stage: 'RETRIEVAL' },
      details: { error: geminiErr.message, retry_count: 2 }
    });

    throw geminiErr;
  }

  // 4. Calculate Business Logic & Persist Claim Candidates
  const createdClaims: ClaimCandidate[] = [];
  const nodeMap = new Map(acceptedNodes.map(n => [n.evidence_id, n]));

  if (clusters.length === 0) {
    // If no clusters could be extracted, write INSUFFICIENT_EVIDENCE
    const emptyClaim = await writeClaimCandidate({
      review_id: reviewId,
      subject_employee_id: subjectEmployeeId,
      theme: 'Overall Performance & Core Competencies',
      evidence_ids: [],
      source_count: 0,
      role_diversity: { self: 0, peer: 0, manager: 0 },
      coverage_confidence: 0.0,
      status: 'INSUFFICIENT_EVIDENCE',
      summary: 'No distinct performance themes could be derived from available feedback.'
    });
    createdClaims.push(emptyClaim);
  } else {
    for (const cluster of clusters) {
      const supportingNodes = cluster.evidence_ids
        .map(id => nodeMap.get(id))
        .filter((n): n is NonNullable<typeof n> => Boolean(n));

      const { confidence, roleDiversity } = calculateCoverageConfidence(supportingNodes);
      const status = applyCoverageFloor(confidence);

      const claim = await writeClaimCandidate({
        review_id: reviewId,
        subject_employee_id: subjectEmployeeId,
        theme: cluster.theme,
        evidence_ids: supportingNodes.map(n => n.evidence_id),
        source_count: supportingNodes.length,
        role_diversity: roleDiversity,
        coverage_confidence: confidence,
        status,
        summary: cluster.summary
      });

      createdClaims.push(claim);
    }
  }

  const duration_ms = Date.now() - startTime;
  const avgConfidence =
    createdClaims.reduce((acc, c) => acc + c.coverage_confidence, 0) / (createdClaims.length || 1);

  // 5. Agent Run Tracking & Audit Logging
  await agentRunsRepository.create({
    id: uuidv4(),
    agent_name: 'Retrieval',
    review_cycle_id: reviewId,
    input_ref: reviewId,
    output_ref: createdClaims.map(c => c.claim_id).join(','),
    status: 'SUCCEEDED',
    confidence: Math.round(avgConfidence * 100) / 100,
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
    actor: { actor_type: 'agent', actor_id: 'Retrieval' },
    timestamp: new Date().toISOString(),
    before_state: null,
    after_state: { status: 'SUCCEEDED', claim_candidates_count: createdClaims.length },
    details: { duration_ms, avg_confidence: avgConfidence, retry_count: retryCount }
  });

  return createdClaims;
}
