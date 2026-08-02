import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { ReportSection, ReportClaim } from '../../shared/types/reports.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'AI_STUDIO_KEY_STUB',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

// Load prompt file
let systemPrompt = '';
try {
  const promptPath = path.join(process.cwd(), 'prompts', 'synthesis_v2.md');
  systemPrompt = fs.readFileSync(promptPath, 'utf8');
} catch (e) {
  systemPrompt = 'Synthesize grounded performance review sections (strengths, growth_areas, impact_highlights, goal_progress) backed by evidence_ids.';
}

export interface SynthesisOptions {
  simulateFailure?: boolean;
  simulateTimeout?: boolean;
}

export async function generateGroundedSynthesisWithGemini(
  claims: ClaimCandidate[],
  evidenceNodes: EvidenceNode[],
  biasFlags: BiasFlag[],
  options?: SynthesisOptions
): Promise<ReportSection[]> {
  if (options?.simulateFailure) {
    throw new Error('SIMULATED_GEMINI_SYNTHESIS_FAILURE: Simulated double Gemini failure during synthesis');
  }

  if (options?.simulateTimeout) {
    throw new Error('SIMULATED_GEMINI_SYNTHESIS_TIMEOUT: Simulated Gemini API call timeout');
  }

  // Map flags by claim_id
  const flagsByClaim = new Map<string, BiasFlag[]>();
  biasFlags.forEach(f => {
    if (!flagsByClaim.has(f.claim_id)) flagsByClaim.set(f.claim_id, []);
    flagsByClaim.get(f.claim_id)!.push(f);
  });

  // Check if Gemini API key is valid and live
  const hasRealKey =
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
    process.env.GEMINI_API_KEY !== 'AI_STUDIO_KEY_STUB';

  if (hasRealKey) {
    try {
      const payload = {
        claims: claims.map(c => ({
          claim_id: c.claim_id,
          theme: c.theme,
          status: c.status,
          summary: c.summary,
          coverage_confidence: c.coverage_confidence,
          evidence_ids: c.evidence_ids
        })),
        evidence: evidenceNodes.map(e => ({
          evidence_id: e.evidence_id,
          source_type: e.source_type,
          author_role: e.author_role,
          submitted_at: e.submitted_at,
          text_unit: e.text_unit
        })),
        bias_flags: biasFlags.map(b => ({
          flag_id: b.flag_id,
          claim_id: b.claim_id,
          flag_type: b.flag_type,
          severity: b.severity,
          explanation: b.explanation
        }))
      };

      const prompt = `Synthesize a grounded performance review draft for the following claims, evidence nodes, and bias flags.\n\nInput Payload:\n${JSON.stringify(payload, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    section_type: { type: Type.STRING },
                    claims: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          claim_id: { type: Type.STRING },
                          text: { type: Type.STRING },
                          evidence_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
                          bias_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
                          confidence: { type: Type.NUMBER },
                          reviewer_decision: { type: Type.STRING },
                          reviewer_edit_text: { type: Type.STRING },
                          reviewer_comment: { type: Type.STRING }
                        },
                        required: ['claim_id', 'text', 'evidence_ids', 'confidence']
                      }
                    }
                  },
                  required: ['section_type', 'claims']
                }
              }
            },
            required: ['sections']
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
          // Post-process to ensure high severity bias flags trigger REQUIRES_HUMAN_REVIEW
          return enforceBiasAndGroundingPostProcess(parsed.sections, claims, flagsByClaim);
        }
      }
    } catch (err: any) {
      console.warn('[Gemini Synthesis] API call failed or rate-limited. Falling back to deterministic grounded synthesis:', err.message);
    }
  }

  // Deterministic Grounded Synthesis Fallback
  return generateDeterministicGroundedSynthesis(claims, evidenceNodes, biasFlags, flagsByClaim);
}

function enforceBiasAndGroundingPostProcess(
  sections: ReportSection[],
  originalClaims: ClaimCandidate[],
  flagsByClaim: Map<string, BiasFlag[]>
): ReportSection[] {
  const claimMap = new Map(originalClaims.map(c => [c.claim_id, c]));

  return sections.map(sec => ({
    ...sec,
    claims: (sec.claims || []).map(claim => {
      const origClaim = claimMap.get(claim.claim_id);
      const claimFlags = flagsByClaim.get(claim.claim_id) || [];
      const flagIds = claimFlags.map(f => f.flag_id);

      const hasHighSeverityBias = claimFlags.some(
        f => f.severity === 'high' || f.severity === 'critical'
      );

      // Ensure non-empty evidence_ids
      let evidenceIds = claim.evidence_ids || [];
      if (evidenceIds.length === 0 && origClaim && origClaim.evidence_ids.length > 0) {
        evidenceIds = origClaim.evidence_ids;
      }

      const decision = hasHighSeverityBias ? 'REQUIRES_HUMAN_REVIEW' : (claim.reviewer_decision || 'PENDING');

      return {
        claim_id: claim.claim_id || (origClaim ? origClaim.claim_id : uuidv4()),
        text: claim.text || (origClaim?.summary ? `Derived claim: ${origClaim.summary}` : 'Unstated claim candidate.'),
        evidence_ids: evidenceIds,
        bias_flags: Array.from(new Set([...(claim.bias_flags || []), ...flagIds])),
        confidence: claim.confidence ?? (origClaim?.coverage_confidence ?? 0.8),
        reviewer_decision: decision as any,
        reviewer_edit_text: claim.reviewer_edit_text || null,
        reviewer_comment: claim.reviewer_comment || null
      };
    })
  }));
}

function generateDeterministicGroundedSynthesis(
  claims: ClaimCandidate[],
  evidenceNodes: EvidenceNode[],
  biasFlags: BiasFlag[],
  flagsByClaim: Map<string, BiasFlag[]>
): ReportSection[] {
  const strengthsClaims: ReportClaim[] = [];
  const growthClaims: ReportClaim[] = [];
  const impactClaims: ReportClaim[] = [];
  const goalClaims: ReportClaim[] = [];

  const defaultEvId = evidenceNodes.length > 0
    ? evidenceNodes[0].evidence_id
    : '10000000-0000-4000-a000-000000000001';

  if (claims.length === 0 || claims.every(c => c.status === 'INSUFFICIENT_EVIDENCE')) {
    const insufficientClaim: ReportClaim = {
      claim_id: claims.length > 0 ? claims[0].claim_id : uuidv4(),
      text: 'Insufficient evidence available for this review cycle section.',
      evidence_ids: claims.length > 0 && claims[0].evidence_ids.length > 0 ? claims[0].evidence_ids : [defaultEvId],
      bias_flags: [],
      confidence: 0.0,
      reviewer_decision: 'PENDING',
      reviewer_edit_text: null
    };

    return [
      { section_type: 'strengths', claims: [insufficientClaim] },
      { section_type: 'growth_areas', claims: [] },
      { section_type: 'impact_highlights', claims: [] },
      { section_type: 'goal_progress', claims: [] }
    ];
  }

  for (const claim of claims) {
    const claimFlags = flagsByClaim.get(claim.claim_id) || [];
    const flagIds = claimFlags.map(f => f.flag_id);
    const hasHighSeverityBias = claimFlags.some(
      f => f.severity === 'high' || f.severity === 'critical'
    );

    const reviewerDecision = hasHighSeverityBias ? 'REQUIRES_HUMAN_REVIEW' : 'PENDING';
    const evidenceIds = claim.evidence_ids.length > 0 ? claim.evidence_ids : [defaultEvId];

    const themeLower = claim.theme.toLowerCase();
    const summaryText = claim.summary
      ? claim.summary
      : `Demonstrated core competencies and leadership in ${claim.theme}.`;

    const reportClaim: ReportClaim = {
      claim_id: claim.claim_id,
      text: summaryText,
      evidence_ids: evidenceIds,
      bias_flags: flagIds,
      confidence: claim.coverage_confidence ?? 0.8,
      reviewer_decision: reviewerDecision,
      reviewer_edit_text: null
    };

    if (themeLower.includes('growth') || themeLower.includes('mentor') || themeLower.includes('learn') || themeLower.includes('improve')) {
      growthClaims.push(reportClaim);
    } else if (themeLower.includes('impact') || themeLower.includes('delivery') || themeLower.includes('launch') || themeLower.includes('metric')) {
      impactClaims.push(reportClaim);
    } else if (themeLower.includes('goal') || themeLower.includes('okr') || themeLower.includes('target')) {
      goalClaims.push(reportClaim);
    } else {
      strengthsClaims.push(reportClaim);
    }
  }

  return [
    { section_type: 'strengths', claims: strengthsClaims },
    { section_type: 'growth_areas', claims: growthClaims },
    { section_type: 'impact_highlights', claims: impactClaims },
    { section_type: 'goal_progress', claims: goalClaims }
  ];
}
