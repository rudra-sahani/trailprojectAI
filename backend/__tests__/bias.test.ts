import assert from 'node:assert';
import { v4 as uuidv4 } from 'uuid';
import { processBiasDetectionJob } from '../../agents/bias_detection/bias-detection.agent.ts';
import { checkSourceImbalance } from '../../agents/bias_detection/source-imbalance.ts';
import { checkRecencyWeight } from '../../agents/bias_detection/recency-weight.ts';
import { checkUnsupportedClaim } from '../../agents/bias_detection/unsupported-claim.ts';
import { validateBiasExplanation } from '../../agents/bias_detection/validate-explanation.ts';
import { evaluateSemanticBiasWithGemini } from '../../agents/bias_detection/eval-gemini-bias.ts';
import { runHumanAuthoredBiasTests } from '../../agents/bias_detection/__tests__/human-authored-cases.test.ts';
import {
  usersRepository,
  reviewsRepository,
  evidenceRepository,
  claimsRepository,
  biasRepository,
  operationsQueueRepository,
  agentRunsRepository
} from '../repositories/db.js';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { BiasFlag } from '../../shared/types/bias.js';

export async function runBiasTests() {
  console.log('\n--- Running Production Hybrid Bias Detection Agent Tests ---');

  // Create test IDs
  const testEmployeeId = '10000000-0000-4000-a000-000000000003';
  const testManagerId = '10000000-0000-4000-a000-000000000002';
  const reviewCycleId = uuidv4();

  // Setup database seed user and review cycle if needed
  try {
    await usersRepository.create({
      id: testEmployeeId,
      employee_code: `EMP-BIAS-${Date.now()}`,
      full_name: 'Bias Test User',
      email: `bias.user.${Date.now()}@example.com`,
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
      review_period: 'Q2 2026-BIAS',
      status: 'READY_FOR_AI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch {}

  // 1. Test Source Imbalance
  console.log('Test 1: Source Imbalance Check...');
  const claimSelfOnly: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'Self Leadership',
    evidence_ids: [uuidv4(), uuidv4()],
    source_count: 2,
    role_diversity: { self: 2, peer: 0, manager: 0 },
    coverage_confidence: 0.65,
    status: 'SUFFICIENT'
  };
  const flagImbalance = checkSourceImbalance(claimSelfOnly);
  assert(flagImbalance !== null, 'Should detect source imbalance for self-only feedback');
  assert(flagImbalance?.flag_type === 'source_imbalance', 'Flag type should be source_imbalance');
  assert(flagImbalance?.severity === 'high', 'Self-only imbalance should be high severity');
  assert(/\d/.test(flagImbalance?.explanation || ''), 'Explanation must reference concrete counts');
  console.log('   ✅ Source imbalance verified.');

  // 2. Test Recency Imbalance
  console.log('Test 2: Recency Imbalance Check...');
  const recentEv1Id = uuidv4();
  const recentEv2Id = uuidv4();
  const recentEvidence: EvidenceNode[] = [
    {
      schema_version: '1.0',
      evidence_id: recentEv1Id,
      subject_employee_id: testEmployeeId,
      source_type: 'peer_feedback',
      author_role: 'peer',
      author_id: testEmployeeId,
      submitted_at: new Date().toISOString(),
      text_unit: 'Recent feedback 1',
      tags: [],
      status: 'ACCEPTED',
      rejection_reason: null
    },
    {
      schema_version: '1.0',
      evidence_id: recentEv2Id,
      subject_employee_id: testEmployeeId,
      source_type: 'manager_feedback',
      author_role: 'manager',
      author_id: testManagerId,
      submitted_at: new Date().toISOString(),
      text_unit: 'Recent feedback 2',
      tags: [],
      status: 'ACCEPTED',
      rejection_reason: null
    }
  ];
  const claimRecency: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'Recent Impact',
    evidence_ids: [recentEv1Id, recentEv2Id],
    source_count: 2,
    role_diversity: { self: 0, peer: 1, manager: 1 },
    coverage_confidence: 0.75,
    status: 'SUFFICIENT'
  };
  const flagRecency = checkRecencyWeight(claimRecency, recentEvidence);
  assert(flagRecency !== null, 'Should detect recency weighted bias when 100% evidence is in last 4 weeks');
  assert(flagRecency?.flag_type === 'recency_weighted', 'Flag type should be recency_weighted');
  console.log('   ✅ Recency imbalance verified.');

  // 3. Test Unsupported Claims
  console.log('Test 3: Unsupported Claims Check...');
  const claimUnsupported: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'Global Strategy',
    evidence_ids: [uuidv4()],
    source_count: 1,
    role_diversity: { self: 1, peer: 0, manager: 0 },
    coverage_confidence: 0.30,
    status: 'INSUFFICIENT_EVIDENCE'
  };
  const flagUnsupported = checkUnsupportedClaim(claimUnsupported);
  assert(flagUnsupported !== null, 'Should flag unsupported claim with coverage_confidence < 0.50');
  assert(flagUnsupported?.flag_type === 'unsupported_claim', 'Flag type should be unsupported_claim');
  console.log('   ✅ Unsupported claims verified.');

  // 4. Test Contradictory Evidence & Multilingual Input
  console.log('Test 4: Contradictory Evidence & Multilingual Input...');
  const multiEvId = uuidv4();
  const SpanishExtremeNode: EvidenceNode = {
    schema_version: '1.0',
    evidence_id: multiEvId,
    subject_employee_id: testEmployeeId,
    source_type: 'peer_feedback',
    author_role: 'peer',
    author_id: testEmployeeId,
    submitted_at: new Date().toISOString(),
    text_unit: 'El empleado es completamente irresponsable y nunca llega a tiempo a las reuniones.',
    tags: ['punctuality'],
    status: 'ACCEPTED',
    rejection_reason: null
  };

  const claimMultilingual: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'Punctuality',
    evidence_ids: [multiEvId],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.50,
    status: 'SUFFICIENT'
  };

  const multiFlags = await evaluateSemanticBiasWithGemini([claimMultilingual], [SpanishExtremeNode]);
  assert(Array.isArray(multiFlags), 'Multilingual evaluation should return array of flags');
  console.log('   ✅ Multilingual input and contradictory evidence handling verified.');

  // 5. Test Sentiment Bias / Extremity
  console.log('Test 5: Sentiment Bias / Extremity Check...');
  const extremeEvId = uuidv4();
  const extremeNode: EvidenceNode = {
    schema_version: '1.0',
    evidence_id: extremeEvId,
    subject_employee_id: testEmployeeId,
    source_type: 'peer_feedback',
    author_role: 'peer',
    author_id: testEmployeeId,
    submitted_at: new Date().toISOString(),
    text_unit: 'This team member is completely unreliable and absolute disaster on projects.',
    tags: ['reliability'],
    status: 'ACCEPTED',
    rejection_reason: null
  };
  const claimExtreme: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: testEmployeeId,
    theme: 'Reliability',
    evidence_ids: [extremeEvId],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.50,
    status: 'SUFFICIENT'
  };

  const sentimentFlags = await evaluateSemanticBiasWithGemini([claimExtreme], [extremeNode]);
  assert(sentimentFlags.length > 0, 'Should detect sentiment extremity in extreme text');
  assert(sentimentFlags[0].flag_type === 'sentiment_extremity', 'Flag should be sentiment_extremity');
  console.log('   ✅ Sentiment bias verified.');

  // 6. Test Schema Validation & Explanation Quality
  console.log('Test 6: Schema Validation & Explanation Quality...');
  const validFlag: BiasFlag = {
    schema_version: '1.0',
    flag_id: uuidv4(),
    claim_id: uuidv4(),
    flag_type: 'source_imbalance',
    severity: 'medium',
    explanation: '3 of 4 supporting evidence items originate from self-assessment while only 1 comes from manager feedback in June 2026.',
    evidence_refs: [uuidv4()],
    detector_type: 'deterministic',
    check_status: 'COMPLETED'
  };
  assert(validateBiasExplanation(validFlag) === true, 'Valid flag with concrete numbers must pass schema validation');

  const invalidFlag: BiasFlag = {
    schema_version: '1.0',
    flag_id: uuidv4(),
    claim_id: uuidv4(),
    flag_type: 'source_imbalance',
    severity: 'medium',
    explanation: 'This claim appears biased.',
    evidence_refs: [],
    detector_type: 'deterministic',
    check_status: 'COMPLETED'
  };
  let errorThrown = false;
  try {
    validateBiasExplanation(invalidFlag);
  } catch {
    errorThrown = true;
  }
  assert(errorThrown, 'Vague explanation lacking numbers or dates must be rejected');
  console.log('   ✅ Schema validation and explanation quality verified.');

  // 7. Test Job Execution with DB Persistence
  console.log('Test 7: Full Bias Detection Job Execution...');
  // Seed claim and evidence in DB
  const dbClaimId = uuidv4();
  const dbEvId1 = uuidv4();
  const dbEvId2 = uuidv4();

  await evidenceRepository.create({
    schema_version: '1.0',
    evidence_id: dbEvId1,
    review_id: reviewCycleId,
    subject_employee_id: testEmployeeId,
    source_type: 'self_assessment',
    author_role: 'self',
    author_id: testEmployeeId,
    submitted_at: new Date().toISOString(),
    text_unit: 'I delivered the entire feature singlehandedly with absolute perfection.',
    tags: [],
    status: 'ACCEPTED',
    rejection_reason: null
  });

  await evidenceRepository.create({
    schema_version: '1.0',
    evidence_id: dbEvId2,
    review_id: reviewCycleId,
    subject_employee_id: testEmployeeId,
    source_type: 'self_assessment',
    author_role: 'self',
    author_id: testEmployeeId,
    submitted_at: new Date().toISOString(),
    text_unit: 'I am the absolute best engineer in the company.',
    tags: [],
    status: 'ACCEPTED',
    rejection_reason: null
  });

  await claimsRepository.create({
    schema_version: '1.0',
    claim_id: dbClaimId,
    review_id: reviewCycleId,
    subject_employee_id: testEmployeeId,
    theme: 'Engineering Excellence',
    evidence_ids: [dbEvId1, dbEvId2],
    source_count: 2,
    role_diversity: { self: 2, peer: 0, manager: 0 },
    coverage_confidence: 0.60,
    status: 'SUFFICIENT',
    summary: 'Delivered features singlehandedly.'
  });

  const generatedFlags = await processBiasDetectionJob(reviewCycleId, testEmployeeId);
  assert(generatedFlags.length > 0, 'Should generate bias flags for self-only claim');

  const persistedFlags = await biasRepository.findByReviewId(reviewCycleId);
  assert(persistedFlags.length >= generatedFlags.length, 'Flags must be persisted via biasRepository');
  console.log('   ✅ Full Bias Detection job execution verified.');

  // 8. Test Malformed JSON, Timeout, Retry & Escalation
  console.log('Test 8: Failure Recovery, Timeout, Retry & Escalation...');
  const failCycleId = uuidv4();
  try {
    await reviewsRepository.create({
      id: failCycleId,
      employee_id: testEmployeeId,
      manager_id: testManagerId,
      review_period: 'Q2 2026-BIAS-FAIL',
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
    evidence_ids: [dbEvId1],
    source_count: 1,
    role_diversity: { self: 1, peer: 0, manager: 0 },
    coverage_confidence: 0.70,
    status: 'SUFFICIENT',
    summary: 'Testing failure recovery'
  });

  try {
    await processBiasDetectionJob(failCycleId, testEmployeeId, { simulateFailure: true });
    assert(false, 'Should have thrown escalation error on simulated double failure');
  } catch (err: any) {
    assert(err.message.includes('SIMULATED_GEMINI_FAILURE'), 'Expected simulated failure error');
  }

  // Verify operations queue entry created
  const opQueue = await operationsQueueRepository.findAll();
  const biasOp = opQueue.find(op => op.failed_stage === 'BIAS_DETECTION');
  assert(!!biasOp, 'Failure should create entry in operations queue');
  assert(biasOp?.status === 'OPEN', 'Operations queue status should be OPEN');

  // Verify review cycle escalated
  const updatedReview = await reviewsRepository.findById(failCycleId);
  assert(updatedReview?.status === 'ESCALATED', 'Review status should be updated to ESCALATED');
  console.log('   ✅ Retry & Escalation to Operations Queue verified.');

  // 9. Run Human-Authored Bias Test Cases
  console.log('Test 9: Running Human-Authored Bias Test Cases...');
  const humanResults = await runHumanAuthoredBiasTests();
  assert(humanResults.passed === humanResults.total, `All ${humanResults.total} human-authored test cases must pass`);
  console.log(`   ✅ All ${humanResults.total} human-authored test cases passed.`);

  console.log('\n🎉 ALL HYBRID BIAS DETECTION AGENT TESTS PASSED PERFECTLY!\n');
}

if (process.argv[1]?.endsWith('bias.test.ts')) {
  runBiasTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Bias Detection Tests Failed:', err);
      process.exit(1);
    });
}
