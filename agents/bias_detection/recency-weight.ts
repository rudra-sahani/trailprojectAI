import { v4 as uuidv4 } from 'uuid';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { BiasFlag } from '../../shared/types/bias.js';

export function checkRecencyWeight(claim: ClaimCandidate, evidenceNodes: EvidenceNode[]): BiasFlag | null {
  const linked = evidenceNodes.filter(n => claim.evidence_ids.includes(n.evidence_id));
  if (linked.length < 2) return null;

  const now = new Date().getTime();
  const FOUR_WEEKS_MS = 28 * 24 * 3600 * 1000;

  const recentCount = linked.filter(n => {
    const time = new Date(n.submitted_at).getTime();
    return (now - time) <= FOUR_WEEKS_MS;
  }).length;

  if (recentCount / linked.length >= 0.8) {
    return {
      schema_version: '1.0',
      flag_id: uuidv4(),
      claim_id: claim.claim_id,
      flag_type: 'recency_weighted',
      severity: 'medium',
      explanation: `${recentCount} of ${linked.length} evidence items (80%+) were submitted in the last 4 weeks of the review period.`,
      evidence_refs: claim.evidence_ids,
      detector_type: 'deterministic',
      check_status: 'COMPLETED'
    };
  }

  return null;
}
