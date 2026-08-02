import { v4 as uuidv4 } from 'uuid';
import { checkSourceImbalance } from '../source-imbalance.js';
import { checkRecencyWeight } from '../recency-weight.js';
import { checkSentimentExtremity } from '../sentiment-extremity.js';
import { checkUnsupportedClaim } from '../unsupported-claim.js';
import { ClaimCandidate } from '../../../shared/types/claims.js';
import { EvidenceNode } from '../../../shared/types/evidence.js';

export async function runHumanAuthoredBiasTests(): Promise<{ total: number; passed: number; results: any[] }> {
  const results: any[] = [];
  let passed = 0;

  // Helper assertions
  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      results.push({ testName, passed: true });
    } else {
      results.push({ testName, passed: false });
    }
  }

  const empId = uuidv4();
  const e1Id = uuidv4();
  const e2Id = uuidv4();
  const e3Id = uuidv4();

  // --- Sub-check 1: Source Imbalance (3 cases) ---
  // Case 1.1: Single source (Self) 100% -> MUST FLAG
  const claimSelfOnly: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Leadership',
    evidence_ids: [e1Id, e2Id],
    source_count: 2,
    role_diversity: { self: 2, peer: 0, manager: 0 },
    coverage_confidence: 0.6,
    status: 'SUFFICIENT'
  };
  const flag1 = checkSourceImbalance(claimSelfOnly);
  assert(flag1 !== null && flag1.flag_type === 'source_imbalance', 'Case 1.1: Self-only feedback must trigger source imbalance flag');

  // Case 1.2: Balanced sources (1 self, 1 peer, 1 manager) -> MUST NOT FLAG
  const claimBalanced: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Technical Delivery',
    evidence_ids: [e1Id, e2Id, e3Id],
    source_count: 3,
    role_diversity: { self: 1, peer: 1, manager: 1 },
    coverage_confidence: 0.85,
    status: 'SUFFICIENT'
  };
  const flag2 = checkSourceImbalance(claimBalanced);
  assert(flag2 === null, 'Case 1.2: Balanced multi-source feedback must NOT trigger source imbalance flag');

  // Case 1.3: Manager only 100% -> MUST FLAG
  const claimManagerOnly: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Architecture',
    evidence_ids: [e1Id, e2Id, e3Id],
    source_count: 3,
    role_diversity: { self: 0, peer: 0, manager: 3 },
    coverage_confidence: 0.7,
    status: 'SUFFICIENT'
  };
  const flag3 = checkSourceImbalance(claimManagerOnly);
  assert(flag3 !== null && flag3.flag_type === 'source_imbalance', 'Case 1.3: Manager-only feedback must trigger source imbalance flag');

  // --- Sub-check 2: Recency Weight (3 cases) ---
  const recentTime = new Date().toISOString();
  const oldTime = new Date(Date.now() - 3600000 * 24 * 120).toISOString();

  const er1 = uuidv4();
  const er2 = uuidv4();
  const es1 = uuidv4();
  const es2 = uuidv4();

  const nodesRecent: EvidenceNode[] = [
    { schema_version: '1.0', evidence_id: er1, subject_employee_id: empId, source_type: 'peer_feedback', author_role: 'peer', author_id: uuidv4(), submitted_at: recentTime, text_unit: 'Recent feedback 1', tags: [], status: 'ACCEPTED', rejection_reason: null },
    { schema_version: '1.0', evidence_id: er2, subject_employee_id: empId, source_type: 'manager_feedback', author_role: 'manager', author_id: uuidv4(), submitted_at: recentTime, text_unit: 'Recent feedback 2', tags: [], status: 'ACCEPTED', rejection_reason: null }
  ];

  const nodesSpread: EvidenceNode[] = [
    { schema_version: '1.0', evidence_id: es1, subject_employee_id: empId, source_type: 'peer_feedback', author_role: 'peer', author_id: uuidv4(), submitted_at: oldTime, text_unit: 'Old feedback 1', tags: [], status: 'ACCEPTED', rejection_reason: null },
    { schema_version: '1.0', evidence_id: es2, subject_employee_id: empId, source_type: 'manager_feedback', author_role: 'manager', author_id: uuidv4(), submitted_at: recentTime, text_unit: 'Recent feedback 2', tags: [], status: 'ACCEPTED', rejection_reason: null }
  ];

  // Case 2.1: 100% evidence in last 4 weeks -> MUST FLAG
  const claimRecent: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Recency Test',
    evidence_ids: [er1, er2],
    source_count: 2,
    role_diversity: { self: 0, peer: 1, manager: 1 },
    coverage_confidence: 0.7,
    status: 'SUFFICIENT'
  };
  const flagRec1 = checkRecencyWeight(claimRecent, nodesRecent);
  assert(flagRec1 !== null && flagRec1.flag_type === 'recency_weighted', 'Case 2.1: 100% recent feedback must trigger recency flag');

  // Case 2.2: Evenly spread timeline -> MUST NOT FLAG
  const claimSpread: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Spread Test',
    evidence_ids: [es1, es2],
    source_count: 2,
    role_diversity: { self: 0, peer: 1, manager: 1 },
    coverage_confidence: 0.8,
    status: 'SUFFICIENT'
  };
  const flagRec2 = checkRecencyWeight(claimSpread, nodesSpread);
  assert(flagRec2 === null, 'Case 2.2: Spread timeline feedback must NOT trigger recency flag');

  // Case 2.3: Single item -> MUST NOT FLAG
  const claimSingleItem: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Single Item',
    evidence_ids: [er1],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.4,
    status: 'SUFFICIENT'
  };
  const flagRec3 = checkRecencyWeight(claimSingleItem, nodesRecent);
  assert(flagRec3 === null, 'Case 2.3: Single evidence item must NOT trigger recency flag');

  // --- Sub-check 3: Sentiment Extremity (3 cases) ---
  const ex1 = uuidv4();
  const nodesExtreme: EvidenceNode[] = [
    { schema_version: '1.0', evidence_id: ex1, subject_employee_id: empId, source_type: 'peer_feedback', author_role: 'peer', author_id: uuidv4(), submitted_at: recentTime, text_unit: 'Employee is completely unreliable and never arrives on time.', tags: [], status: 'ACCEPTED', rejection_reason: null }
  ];

  const claimExtreme: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Punctuality',
    evidence_ids: [ex1],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.4,
    status: 'SUFFICIENT'
  };

  // Case 3.1: Extreme text -> MUST FLAG
  const flagExt = await checkSentimentExtremity(claimExtreme, nodesExtreme);
  assert(flagExt !== null && flagExt.flag_type === 'sentiment_extremity', 'Case 3.1: Extreme language must trigger sentiment extremity flag');

  // Case 3.2: Neutral text -> MUST NOT FLAG
  const claimNeutral: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Execution',
    evidence_ids: [es1],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.7,
    status: 'SUFFICIENT'
  };
  const flagNeu = await checkSentimentExtremity(claimNeutral, nodesSpread);
  assert(flagNeu === null, 'Case 3.2: Neutral phrasing must NOT trigger sentiment extremity flag');

  // Case 3.3: Constructive critique -> MUST NOT FLAG
  const con1 = uuidv4();
  const nodesConstructive: EvidenceNode[] = [
    { schema_version: '1.0', evidence_id: con1, subject_employee_id: empId, source_type: 'peer_feedback', author_role: 'peer', author_id: uuidv4(), submitted_at: recentTime, text_unit: 'Alex could improve communication during team sprint standups.', tags: [], status: 'ACCEPTED', rejection_reason: null }
  ];
  const claimConstructive: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Communication',
    evidence_ids: [con1],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.6,
    status: 'SUFFICIENT'
  };
  const flagCon = await checkSentimentExtremity(claimConstructive, nodesConstructive);
  assert(flagCon === null, 'Case 3.3: Constructive feedback must NOT trigger sentiment extremity flag');

  // --- Sub-check 4: Unsupported Claim (3 cases) ---
  // Case 4.1: Low confidence (0.4) & single source -> MUST FLAG
  const claimLowConf: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Strategic Planning',
    evidence_ids: [e1Id],
    source_count: 1,
    role_diversity: { self: 1, peer: 0, manager: 0 },
    coverage_confidence: 0.40,
    status: 'SUFFICIENT'
  };
  const flagUnsup1 = checkUnsupportedClaim(claimLowConf);
  assert(flagUnsup1 !== null && flagUnsup1.flag_type === 'unsupported_claim', 'Case 4.1: Low coverage confidence (0.40) must trigger unsupported claim flag');

  // Case 4.2: High confidence (0.85) & 3 sources -> MUST NOT FLAG
  const flagUnsup2 = checkUnsupportedClaim(claimBalanced);
  assert(flagUnsup2 === null, 'Case 4.2: High coverage confidence (0.85) must NOT trigger unsupported claim flag');

  // Case 4.3: Very low confidence (0.25) -> MUST FLAG
  const claimVeryLow: ClaimCandidate = {
    schema_version: '1.0',
    claim_id: uuidv4(),
    subject_employee_id: empId,
    theme: 'Global Operations',
    evidence_ids: [e1Id],
    source_count: 1,
    role_diversity: { self: 0, peer: 1, manager: 0 },
    coverage_confidence: 0.25,
    status: 'INSUFFICIENT_EVIDENCE'
  };
  const flagUnsup3 = checkUnsupportedClaim(claimVeryLow);
  assert(flagUnsup3 !== null && flagUnsup3.flag_type === 'unsupported_claim', 'Case 4.3: Very low confidence (0.25) must trigger unsupported claim flag');

  return {
    total: 12,
    passed,
    results
  };
}
