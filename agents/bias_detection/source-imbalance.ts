import { v4 as uuidv4 } from 'uuid';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { BiasFlag } from '../../shared/types/bias.js';

export function checkSourceImbalance(claim: ClaimCandidate): BiasFlag | null {
  const { self, peer, manager } = claim.role_diversity;
  const total = claim.source_count;

  if (total === 0) return null;

  // Rule 1: Single source role accounts for >= 75% of total evidence
  if (self / total >= 0.75 && total >= 2) {
    return {
      schema_version: '1.0',
      flag_id: uuidv4(),
      claim_id: claim.claim_id,
      flag_type: 'source_imbalance',
      severity: 'high',
      explanation: `${self} of ${total} evidence items (75%+) originated from self-assessment without peer or manager balance.`,
      evidence_refs: claim.evidence_ids,
      detector_type: 'deterministic',
      check_status: 'COMPLETED'
    };
  }

  if (manager / total >= 0.8 && total >= 2) {
    return {
      schema_version: '1.0',
      flag_id: uuidv4(),
      claim_id: claim.claim_id,
      flag_type: 'source_imbalance',
      severity: 'medium',
      explanation: `${manager} of ${total} evidence items originated solely from manager feedback.`,
      evidence_refs: claim.evidence_ids,
      detector_type: 'deterministic',
      check_status: 'COMPLETED'
    };
  }

  if (peer === 0 && total >= 2) {
    return {
      schema_version: '1.0',
      flag_id: uuidv4(),
      claim_id: claim.claim_id,
      flag_type: 'source_imbalance',
      severity: 'low',
      explanation: `Claim is supported by ${total} items but has 0 peer feedback contributions.`,
      evidence_refs: claim.evidence_ids,
      detector_type: 'deterministic',
      check_status: 'COMPLETED'
    };
  }

  return null;
}
