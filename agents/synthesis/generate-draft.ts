import { ClaimCandidate } from '../../shared/types/claims.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { ReportSection } from '../../shared/types/reports.js';
import { generateGroundedSynthesisWithGemini, SynthesisOptions } from './eval-gemini-synthesis.js';

export async function generateDraftSections(
  claims: ClaimCandidate[],
  flags: BiasFlag[],
  evidenceNodes: EvidenceNode[] = [],
  options?: SynthesisOptions
): Promise<ReportSection[]> {
  return generateGroundedSynthesisWithGemini(claims, evidenceNodes, flags, options);
}
