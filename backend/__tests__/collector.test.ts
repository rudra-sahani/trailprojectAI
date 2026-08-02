import { processCollectorJob } from '../../agents/collector/collector.agent.js';
import {
  evidenceRepository,
  agentRunsRepository,
  operationsQueueRepository,
  reviewsRepository,
  auditRepository
} from '../repositories/db.js';
import { EvidenceNodeSchema } from '../../shared/schemas/index.js';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export async function runCollectorTests() {
  console.log('🧪 Running VeriReview AI Collector Agent Production Test Suite...\n');

  const validReviewId = '30000000-0000-4000-a000-000000000001';
  const validEmployeeId = '10000000-0000-4000-a000-000000000003';

  // Ensure review cycle exists for status updates
  try {
    await reviewsRepository.create({
      id: validReviewId,
      employee_id: validEmployeeId,
      manager_id: '10000000-0000-4000-a000-000000000002',
      review_period: 'Q2 2026',
      status: 'READY_FOR_AI',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  } catch {
    // Already exists
  }

  // ------------------------------------------------------------------------
  // Test 1: Malformed Input Validation (Missing review_id, employee_id, source_type)
  // ------------------------------------------------------------------------
  console.log('Test 1: Malformed Input Validation...');
  try {
    await processCollectorJob({
      subject_employee_id: validEmployeeId,
      source_type: 'PEER_FEEDBACK',
      raw_text: 'Great teammate'
    });
    assert(false, 'Should have failed missing review_id');
  } catch (err: any) {
    assert(err.message.includes('ERR_COLLECTOR_MISSING_REVIEW_ID'), 'Expected ERR_COLLECTOR_MISSING_REVIEW_ID error');
  }

  try {
    await processCollectorJob({
      review_id: validReviewId,
      source_type: 'PEER_FEEDBACK',
      raw_text: 'Great teammate'
    });
    assert(false, 'Should have failed missing subject_employee_id');
  } catch (err: any) {
    assert(err.message.includes('ERR_COLLECTOR_UNKNOWN_EMPLOYEE'), 'Expected ERR_COLLECTOR_UNKNOWN_EMPLOYEE error');
  }

  try {
    await processCollectorJob({
      review_id: validReviewId,
      subject_employee_id: validEmployeeId,
      source_type: 'INVALID_SOURCE',
      raw_text: 'Great teammate'
    });
    assert(false, 'Should have failed invalid source_type');
  } catch (err: any) {
    assert(err.message.includes('ERR_COLLECTOR_INVALID_SOURCE_TYPE'), 'Expected ERR_COLLECTOR_INVALID_SOURCE_TYPE error');
  }
  console.log('   ✅ Malformed input parameters rejected correctly.');

  // ------------------------------------------------------------------------
  // Test 2: Empty / Whitespace Feedback Validation
  // ------------------------------------------------------------------------
  console.log('Test 2: Empty Feedback Validation...');
  try {
    await processCollectorJob({
      review_id: validReviewId,
      subject_employee_id: validEmployeeId,
      source_type: 'PEER_FEEDBACK',
      author_role: 'peer',
      author_id: validEmployeeId,
      submitted_at: new Date().toISOString(),
      raw_text: '   \n  \t '
    });
    assert(false, 'Should have failed empty raw_text');
  } catch (err: any) {
    assert(err.message.includes('ERR_COLLECTOR_EMPTY_TEXT'), 'Expected ERR_COLLECTOR_EMPTY_TEXT error');
  }
  console.log('   ✅ Empty raw text rejected correctly.');

  // ------------------------------------------------------------------------
  // Test 3: Normal Feedback Processing & Schema Validation
  // ------------------------------------------------------------------------
  console.log('Test 3: Normal Feedback Processing & Schema Validation...');
  const normalNodes = await processCollectorJob({
    review_id: validReviewId,
    subject_employee_id: validEmployeeId,
    source_type: 'PEER_FEEDBACK',
    author_role: 'peer',
    author_id: validEmployeeId,
    submitted_at: new Date().toISOString(),
    raw_text: 'Alex consistently led sprint planning and delivered the API migration on time with 99.9% uptime. Also helped unblock junior team members during code reviews.'
  });

  assert(normalNodes.length > 0, 'Should generate at least 1 evidence node');
  for (const node of normalNodes) {
    EvidenceNodeSchema.parse(node);
    assert(node.status === 'ACCEPTED', 'Status should be ACCEPTED');
    assert(node.text_unit.length <= 2000, 'Text unit length <= 2000');
    assert(node.subject_employee_id === validEmployeeId, 'Employee ID match');
  }
  console.log(`   ✅ Processed feedback into ${normalNodes.length} valid evidence node(s).`);

  // ------------------------------------------------------------------------
  // Test 4: Long Feedback Truncation & Segmentation (>2000 chars)
  // ------------------------------------------------------------------------
  console.log('Test 4: Long Feedback (>2000 chars) Handling...');
  const longText = 'Alex demonstrated exceptional technical leadership throughout the year. '.repeat(35);
  assert(longText.length > 2000, 'Test input length > 2000');

  const longNodes = await processCollectorJob({
    review_id: validReviewId,
    subject_employee_id: validEmployeeId,
    source_type: 'MANAGER_FEEDBACK',
    author_role: 'manager',
    author_id: '10000000-0000-4000-a000-000000000002',
    submitted_at: new Date().toISOString(),
    raw_text: longText
  });

  assert(longNodes.length > 0, 'Long feedback should produce evidence nodes');
  for (const node of longNodes) {
    assert(node.text_unit.length <= 2000, 'Every evidence node text unit must be <= 2000 chars');
  }
  console.log(`   ✅ Long feedback segmented safely into ${longNodes.length} node(s) <= 2000 chars.`);

  // ------------------------------------------------------------------------
  // Test 5: Multilingual Feedback Processing (Spanish & Japanese)
  // ------------------------------------------------------------------------
  console.log('Test 5: Multilingual Feedback Processing...');
  const spanishNodes = await processCollectorJob({
    review_id: validReviewId,
    subject_employee_id: validEmployeeId,
    source_type: 'SELF_ASSESSMENT',
    author_role: 'self',
    author_id: validEmployeeId,
    submitted_at: new Date().toISOString(),
    raw_text: 'Lideré con éxito la migración de la base de datos de Q2, reduciendo la latencia en un 40%. También colaboré con el equipo de diseño.'
  });
  assert(spanishNodes.length > 0, 'Spanish feedback should produce evidence nodes');

  const japaneseNodes = await processCollectorJob({
    review_id: validReviewId,
    subject_employee_id: validEmployeeId,
    source_type: 'PEER_FEEDBACK',
    author_role: 'peer',
    author_id: validEmployeeId,
    submitted_at: new Date().toISOString(),
    raw_text: 'Q2のプロジェクトでパフォーマンスを大幅に向上させ、チームを指導しました。'
  });
  assert(japaneseNodes.length > 0, 'Japanese feedback should produce evidence nodes');
  console.log('   ✅ Multilingual feedback processed correctly.');

  // ------------------------------------------------------------------------
  // Test 6: Duplicate Feedback Handling
  // ------------------------------------------------------------------------
  console.log('Test 6: Duplicate Feedback Handling...');
  const dupInput = {
    review_id: validReviewId,
    subject_employee_id: validEmployeeId,
    source_type: 'PEER_FEEDBACK',
    author_role: 'peer' as const,
    author_id: validEmployeeId,
    submitted_at: new Date().toISOString(),
    raw_text: 'Great collaboration during sprint execution.'
  };

  const run1 = await processCollectorJob(dupInput);
  const run2 = await processCollectorJob(dupInput);
  assert(run1[0].evidence_id !== run2[0].evidence_id, 'Duplicate submissions should produce distinct evidence_ids');
  console.log('   ✅ Duplicate feedback handled with distinct IDs.');

  // ------------------------------------------------------------------------
  // Test 7: Failure Recovery, Escalation & Operations Queue
  // ------------------------------------------------------------------------
  console.log('Test 7: Failure Recovery, Retry & Escalation...');
  try {
    await processCollectorJob({
      review_id: validReviewId,
      subject_employee_id: validEmployeeId,
      source_type: 'PEER_FEEDBACK',
      author_role: 'peer',
      author_id: validEmployeeId,
      submitted_at: new Date().toISOString(),
      raw_text: 'Testing failure recovery',
      simulateFailure: true
    });
    assert(false, 'Should have thrown escalation error on simulated double failure');
  } catch (err: any) {
    assert(err.message.includes('SIMULATED_GEMINI_FAILURE'), 'Expected simulated failure error');
  }

  // Verify operations queue entry created
  const opQueue = await operationsQueueRepository.findAll();
  const collectorOp = opQueue.find(op => op.failed_stage === 'COLLECTOR');
  assert(!!collectorOp, 'Failure should create entry in operations queue');
  assert(collectorOp?.status === 'OPEN', 'Operations queue status should be OPEN');

  // Verify review cycle escalated
  const updatedReview = await reviewsRepository.findById(validReviewId);
  assert(updatedReview?.status === 'ESCALATED', 'Review status should be updated to ESCALATED');

  console.log('   ✅ Retry & Escalation to Operations Queue verified.');

  console.log('\n🎉 ALL COLLECTOR AGENT TESTS PASSED PERFECTLY!\n');
}
