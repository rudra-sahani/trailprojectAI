import { v4 as uuidv4 } from 'uuid';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { BiasFlag } from '../../shared/types/bias.js';

export function checkUnsupportedClaim(claim: ClaimCandidate): BiasFlag | null {
  if (claim.coverage_confidence < 0.50 || claim.evidence_ids.length <= 1) {
    return {
      schema_version: '1.0',
      flag_id: uuidv4(),
      claim_id: claim.claim_id,
      flag_type: 'unsupported_claim',
      severity: claim.coverage_confidence < 0.35 ? 'high' : 'medium',
      explanation: `Claim topic '${claim.theme}' is supported by only ${claim.evidence_ids.length} item with coverage confidence ${claim.coverage_confidence.toFixed(2)}.`,
      evidence_refs: claim.evidence_ids,
      detector_type: 'llm_assisted',
      check_status: 'COMPLETED'
    };
  }
  return null;
}
