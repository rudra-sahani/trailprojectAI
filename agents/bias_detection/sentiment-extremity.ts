import { ClaimCandidate } from '../../shared/types/claims.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { evaluateSemanticBiasWithGemini } from './eval-gemini-bias.js';

export async function checkSentimentExtremity(
  claim: ClaimCandidate,
  evidenceNodes: EvidenceNode[]
): Promise<BiasFlag | null> {
  const flags = await evaluateSemanticBiasWithGemini([claim], evidenceNodes);
  const sentimentFlag = flags.find(f => f.flag_type === 'sentiment_extremity' && f.claim_id === claim.claim_id);
  return sentimentFlag || null;
}
