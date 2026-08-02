import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { processSynthesisJob } from '../../agents/synthesis/synthesis.agent.ts';
import { generateGroundedSynthesisWithGemini } from '../../agents/synthesis/eval-gemini-synthesis.ts';
import { validateDraftReport } from '../../agents/synthesis/validate-draft.ts';
import { calculateOverallConfidence } from '../../agents/synthesis/aggregate-confidence.ts';
import {
  usersRepository,
  reviewsRepository,
  evidenceRepository,
  claimsRepository,
  biasRepository,
  reportsRepository,
  operationsQueueRepository,
  agentRunsRepository
} from '../repositories/db.js';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { ReportSection } from '../../shared/types/reports.js';

export async function runSynthesisTests() {
  console.log('\n--- Running Production Synthesis Agent Tests ---');

  const testEmployeeId = '10000000-0000-4000-a000-000000000003';
  const testManagerId = '10000000-0000-4000-a000-000000000002';
  const reviewCycleId = uuidv4();

  // Setup seed user and review cycle in DB
  try {
    await usersRepository.create({
      id: testEmployeeId,
      employee_code: `EMP-SYNTH-${Date.now()}`,
      full_name: 'Synthesis Test User',
      email: `synthesis.user.${Date.now()}@example.com`,
      role: 'EMPLOYEE',
      is_active: true,
      created_at: new Date().toISOString()
    });
  } catch {}

  try {
    await reviewsRepository.create({
      id: reviewCycleId,
      employee_id: testEmployeeId,
      manager_id: testManagerId,
      review_period: 'Q2 2026-SYNTH',
      status: 'READY_FOR_AI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch {}

  // 1. Grounded Report Generation with Evidence Citations
  console.log('Test 1: Grounded Draft Generation with Evidence Citations...');
  const ev1Id = uuidv4();
  const ev2Id = uuidv4();
  const evNodes: EvidenceNode[] = [
    {
      schema_version: '1.0',
      evidence_id: ev1Id,
      subject_employee_id: testEmployeeId,
      source_type: 'peer_feedback',
      author_role: 'peer',
      author_id: testEmployeeId,
      submitted_at: new Date().toISOString(),
      text_unit: 'Led the API migration project and unblocked 3 engineers.',
      tags: ['technical_leadership'],
      status: 'ACCEPTED',
      rejection_reason: null
    },
    {
      schema_version: '1.0',
      evidence_id: ev2Id,
      subject_employee_id: testEmployeeId,
      source_type: 'manager_feedback',
      author_role: 'manager',
      author_id: testManagerId,
      submitted_at: new Date().toISOString(),
      text_unit: 'Delivered high impact system architecture improvements.',
      tags: ['impact'],
      status: 'ACCEPTED',
      rejection_reason: null
    }
  ];

  const claim1Id = uuidv4();
  const claim1: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: claim1Id,
    subject_employee_id: testEmployeeId,
    theme: 'Technical Leadership',
    evidence_ids: [ev1Id],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.85,
    status: 'SUFFICIENT',
    summary: 'Led API migration project and unblocked teammates.'
  };

  const sections = await generateGroundedSynthesisWithGemini([claim1], evNodes, []);
  assert(Array.isArray(sections) && sections.length === 4, 'Must return 4 required report sections');
  const strengthsSec = sections.find(s => s.section_type === 'strengths');
  assert(strengthsSec && strengthsSec.claims.length > 0, 'Strengths section must contain claims');
  assert(strengthsSec.claims[0].evidence_ids.includes(ev1Id), 'Generated claim must cite evidence_id');
  console.log('   ✅ Grounded draft generation verified.');

  // 2. Insufficient Evidence Handling
  console.log('Test 2: Insufficient Evidence Handling...');
  const emptyClaim: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'General Performance',
    evidence_ids: [ev1Id],
    source_count: 0,
    role_diversity: { self: 0, peer: 0, manager: 0 },
    coverage_confidence: 0.0,
    status: 'INSUFFICIENT_EVIDENCE',
    summary: 'Insufficient feedback collected.'
  };

  const insufficientSections = await generateGroundedSynthesisWithGemini([emptyClaim], evNodes, []);
  assert(insufficientSections.length === 4, 'Must return 4 sections even when evidence is insufficient');
  const allClaims = insufficientSections.flatMap(s => s.claims);
  const containsNote = allClaims.some(c => c.text.includes('Insufficient evidence'));
  assert(containsNote, 'Must generate explicit INSUFFICIENT_EVIDENCE notice when evidence is sparse');
  console.log('   ✅ Insufficient evidence handling verified.');

  // 3. High Severity Bias Flag -> REQUIRES_HUMAN_REVIEW
  console.log('Test 3: High Severity Bias Flag Marking (REQUIRES_HUMAN_REVIEW)...');
  const biasedClaimId = uuidv4();
  const biasedClaim: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: biasedClaimId,
    subject_employee_id: testEmployeeId,
    theme: 'Self Leadership',
    evidence_ids: [ev1Id],
    source_count: 1,
    role_diversity: { self: 1, peer: 0, manager: 0 },
    coverage_confidence: 0.60,
    status: 'SUFFICIENT',
    summary: 'Claim with heavy self-assessment bias.'
  };

  const flagId = uuidv4();
  const highBiasFlag: BiasFlag = {
    schema_version: '1.0',
    flag_id: flagId,
    claim_id: biasedClaimId,
    flag_type: 'source_imbalance',
    severity: 'high',
    explanation: '100% of feedback originates from self assessment.',
    evidence_refs: [ev1Id],
    detector_type: 'deterministic',
    check_status: 'COMPLETED'
  };

  const biasedSections = await generateGroundedSynthesisWithGemini([biasedClaim], evNodes, [highBiasFlag]);
  const biasedReportClaim = biasedSections.flatMap(s => s.claims).find(c => c.claim_id === biasedClaimId);
  assert(biasedReportClaim !== undefined, 'Biased claim must be present in report sections');
  assert(biasedReportClaim.reviewer_decision === 'REQUIRES_HUMAN_REVIEW', 'Claim with high severity bias flag must be set to REQUIRES_HUMAN_REVIEW');
  console.log('   ✅ High severity bias flag REQUIRES_HUMAN_REVIEW verified.');

  // 4. Grounding Validation & Missing Citation Guard
  console.log('Test 4: Grounding Validation & Missing Citation Error...');
  const validSecs: ReportSection[] = [
    {
      section_type: 'strengths',
      claims: [
        {
          claim_id: uuidv4(),
          text: 'Valid claim text',
          evidence_ids: [ev1Id],
          bias_flags: [],
          confidence: 0.8,
          reviewer_decision: 'PENDING',
          reviewer_edit_text: null
        }
      ]
    },
    { section_type: 'growth_areas', claims: [] },
    { section_type: 'impact_highlights', claims: [] },
    { section_type: 'goal_progress', claims: [] }
  ];

  assert(validateDraftReport(validSecs) === true, 'Valid report sections must pass validation');

  const ungroundedSecs: ReportSection[] = [
    {
      section_type: 'strengths',
      claims: [
        {
          claim_id: uuidv4(),
          text: 'Ungrounded claim text',
          evidence_ids: [], // Missing citations!
          bias_flags: [],
          confidence: 0.8,
          reviewer_decision: 'PENDING',
          reviewer_edit_text: null
        }
      ]
    },
    { section_type: 'growth_areas', claims: [] },
    { section_type: 'impact_highlights', claims: [] },
    { section_type: 'goal_progress', claims: [] }
  ];

  let ungroundedError = false;
  try {
    validateDraftReport(ungroundedSecs);
  } catch (err: any) {
    ungroundedError = err.message.includes('ERR_SYNTHESIS_UNGROUNDED_CLAIM');
  }
  assert(ungroundedError, 'Missing evidence citations must trigger ERR_SYNTHESIS_UNGROUNDED_CLAIM error');
  console.log('   ✅ Grounding validation and missing citation guard verified.');

  // 5. Confidence Aggregation Calculation
  console.log('Test 5: Report Confidence Aggregation Calculation...');
  const confidenceVal = calculateOverallConfidence(validSecs);
  assert(confidenceVal === 0.8, 'Overall confidence should equal 0.8 for a single 0.8 claim');
  console.log('   ✅ Report confidence aggregation verified.');

  // 6. Multilingual Input Handling
  console.log('Test 6: Multilingual Input Handling...');
  const spanishEvId = uuidv4();
  const spanishEvNode: EvidenceNode = {
    schema_version: '1.0',
    evidence_id: spanishEvId,
    subject_employee_id: testEmployeeId,
    source_type: 'peer_feedback',
    author_role: 'peer',
    author_id: testEmployeeId,
    submitted_at: new Date().toISOString(),
    text_unit: 'Demostró un liderazgo técnico excepcional durante la migración de la base de datos.',
    tags: [],
    status: 'ACCEPTED',
    rejection_reason: null
  };

  const spanishClaim: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'Liderazgo Técnico',
    evidence_ids: [spanishEvId],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.80,
    status: 'SUFFICIENT',
    summary: 'Demostró liderazgo técnico.'
  };

  const spanishSections = await generateGroundedSynthesisWithGemini([spanishClaim], [spanishEvNode], []);
  assert(spanishSections.length === 4, 'Multilingual input must produce 4 standard sections');
  console.log('   ✅ Multilingual input handling verified.');

  // 7. DB Persistence & Job Execution
  console.log('Test 7: Full Synthesis Job Execution & DB Persistence...');
  const dbClaimId = uuidv4();
  const dbEvId = uuidv4();

  await evidenceRepository.create({
    schema_version: '1.0',
    evidence_id: dbEvId,
    review_id: reviewCycleId,
    subject_employee_id: testEmployeeId,
    source_type: 'peer_feedback',
    author_role: 'peer',
    author_id: testEmployeeId,
    submitted_at: new Date().toISOString(),
    text_unit: 'Great teamwork and technical documentation.',
    tags: [],
    status: 'ACCEPTED',
    rejection_reason: null
  });

  await claimsRepository.create({
    schema_version: '1.0',
    claim_id: dbClaimId,
    review_id: reviewCycleId,
    subject_employee_id: testEmployeeId,
    theme: 'Teamwork',
    evidence_ids: [dbEvId],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.85,
    status: 'SUFFICIENT',
    summary: 'Great teamwork and documentation.'
  });

  const generatedReport = await processSynthesisJob(reviewCycleId, testEmployeeId);
  assert(!!generatedReport.report_id, 'Generated draft report must contain report_id');
  assert(generatedReport.prompt_version === 'synthesis_v2', 'Prompt version must be synthesis_v2');

  const persistedReport = await reportsRepository.findByReviewId(reviewCycleId);
  assert(persistedReport !== null, 'Report must be persisted in database via reportsRepository');
  assert(persistedReport?.report_id === generatedReport.report_id, 'Persisted report ID must match generated report ID');

  const updatedReview = await reviewsRepository.findById(reviewCycleId);
  assert(updatedReview?.status === 'HUMAN_REVIEW', 'Review status must be updated to HUMAN_REVIEW');
  console.log('   ✅ Full Synthesis job execution & DB persistence verified.');

  // 8. Failure Recovery, Timeout, Retry & Escalation
  console.log('Test 8: Failure Recovery, Retry & Escalation...');
  const failCycleId = uuidv4();
  try {
    await reviewsRepository.create({
      id: failCycleId,
      employee_id: testEmployeeId,
      manager_id: testManagerId,
      review_period: 'Q2 2026-SYNTH-FAIL',
      status: 'READY_FOR_AI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch {}

  const failClaimId = uuidv4();
  await claimsRepository.create({
    schema_version: '1.0',
    claim_id: failClaimId,
    review_id: failCycleId,
    subject_employee_id: testEmployeeId,
    theme: 'Failure Test',
    evidence_ids: [dbEvId],
    source_count: 1,
    role_diversity: { self: 1, peer: 0, manager: 0 },
    coverage_confidence: 0.70,
    status: 'SUFFICIENT',
    summary: 'Testing synthesis failure recovery'
  });

  try {
    await processSynthesisJob(failCycleId, testEmployeeId, { simulateFailure: true });
    assert(false, 'Should have thrown escalation error on simulated double failure');
  } catch (err: any) {
    assert(err.message.includes('SIMULATED_GEMINI_SYNTHESIS_FAILURE'), 'Expected simulated failure error');
  }

  // Verify operations queue entry created
  const opQueue = await operationsQueueRepository.findAll();
  const synthOp = opQueue.find(op => op.failed_stage === 'SYNTHESIS' && op.review_id === failCycleId);
  assert(!!synthOp, 'Failure should create entry in operations queue');
  assert(synthOp?.status === 'OPEN', 'Operations queue status should be OPEN');

  // Verify review cycle escalated
  const escalatedReview = await reviewsRepository.findById(failCycleId);
  assert(escalatedReview?.status === 'ESCALATED', 'Review status should be updated to ESCALATED');
  console.log('   ✅ Retry & Escalation to Operations Queue verified.');

  console.log('\n🎉 ALL PRODUCTION SYNTHESIS AGENT TESTS PASSED PERFECTLY!\n');
}

if (process.argv[1]?.endsWith('synthesis.test.ts')) {
  runSynthesisTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Synthesis Agent Tests Failed:', err);
      process.exit(1);
    });
}
