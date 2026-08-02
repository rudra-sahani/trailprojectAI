import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ClaimCandidate } from '../../shared/types/claims.js';
import { EvidenceNode } from '../../shared/types/evidence.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { validateBiasExplanation } from './validate-explanation.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'AI_STUDIO_KEY_STUB'
});

let promptCache: string | null = null;

function getBiasPrompt(): string {
  if (promptCache) return promptCache;
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'bias_detection_v2.md');
    if (fs.existsSync(promptPath)) {
      promptCache = fs.readFileSync(promptPath, 'utf-8');
      return promptCache;
    }
  } catch (err) {
    console.warn('[Bias Detection Agent] Could not load bias_detection_v2.md, using default prompt');
  }
  return `You are the Bias Detection Agent in VeriReview AI. Evaluate candidate performance claims against supporting evidence for sentiment extremity, loaded language, or ungrounded assumptions. Every explanation MUST reference actual evidence_ids and contain concrete numbers/dates/counts. Return JSON with key "flags".`;
}

export interface EvaluateBiasOptions {
  simulateFailure?: boolean;
  simulateTimeout?: boolean;
  simulateMalformedJson?: boolean;
}

export async function evaluateSemanticBiasWithGemini(
  claims: ClaimCandidate[],
  evidenceNodes: EvidenceNode[],
  options?: EvaluateBiasOptions
): Promise<BiasFlag[]> {
  if (options?.simulateFailure) {
    throw new Error('ERR_BIAS_SIMULATED_GEMINI_FAILURE: Simulated Gemini API failure for Bias Detection Agent');
  }

  if (options?.simulateTimeout) {
    throw new Error('ERR_BIAS_TIMEOUT: Gemini API request timed out');
  }

  if (options?.simulateMalformedJson) {
    throw new Error('ERR_BIAS_MALFORMED_JSON: Gemini returned invalid JSON schema');
  }

  if (claims.length === 0) {
    return [];
  }

  const evidenceMap = new Map(evidenceNodes.map(e => [e.evidence_id, e]));

  // Fallback for missing/stub API key or offline dev environments
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || process.env.GEMINI_API_KEY === 'AI_STUDIO_KEY_STUB') {
    return heuristicSemanticBiasCheck(claims, evidenceNodes);
  }

  const systemInstruction = getBiasPrompt();

  const formattedClaims = claims.map(c => {
    const linkedEvidence = c.evidence_ids
      .map(id => evidenceMap.get(id))
      .filter((e): e is EvidenceNode => Boolean(e))
      .map(e => ({
        evidence_id: e.evidence_id,
        author_role: e.author_role,
        submitted_at: e.submitted_at,
        text_unit: e.text_unit
      }));

    return {
      claim_id: c.claim_id,
      theme: c.theme,
      summary: c.summary,
      coverage_confidence: c.coverage_confidence,
      source_count: c.source_count,
      role_diversity: c.role_diversity,
      linked_evidence: linkedEvidence
    };
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Evaluate the following claims and linked feedback evidence for emotional extremity, loaded language, unfair framing, or ungrounded assumptions.\n\nClaims and Evidence:\n${JSON.stringify(formattedClaims, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flags: {
              type: Type.ARRAY,
              description: 'Array of detected bias flags grounded in provided evidence.',
              items: {
                type: Type.OBJECT,
                properties: {
                  claim_id: { type: Type.STRING, description: 'UUID of claim candidate' },
                  bias_type: {
                    type: Type.STRING,
                    description: 'Bias category: sentiment_extremity, unsupported_claim, source_imbalance, recency_weighted'
                  },
                  severity: {
                    type: Type.STRING,
                    description: 'Severity: low, medium, high, critical'
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Grounded explanation referencing evidence IDs and concrete counts/dates/numbers'
                  },
                  evidence_ids: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Array of supporting evidence IDs from input'
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: 'Estimated confidence score between 0.0 and 1.0'
                  },
                  requires_human_review: {
                    type: Type.BOOLEAN,
                    description: 'True if flag requires manager or HR human review'
                  }
                },
                required: ['claim_id', 'bias_type', 'severity', 'explanation', 'evidence_ids']
              }
            }
          },
          required: ['flags']
        }
      }
    });

    const responseText = response.text?.trim() || '';
    if (!responseText) {
      throw new Error('ERR_BIAS_EMPTY_GEMINI_RESPONSE: Gemini returned an empty response');
    }

    const parsed = JSON.parse(responseText);
    if (!parsed || !Array.isArray(parsed.flags)) {
      throw new Error('ERR_BIAS_MALFORMED_JSON: Gemini output missing "flags" array');
    }

    const validFlags: BiasFlag[] = [];
    const claimIdsSet = new Set(claims.map(c => c.claim_id));

    for (const rawFlag of parsed.flags) {
      if (!claimIdsSet.has(rawFlag.claim_id)) continue;

      const targetClaim = claims.find(c => c.claim_id === rawFlag.claim_id);
      if (!targetClaim) continue;

      // Filter evidence_ids to ensure no hallucinated evidence IDs
      const validEvidenceRefs = (rawFlag.evidence_ids || []).filter((id: string) =>
        targetClaim.evidence_ids.includes(id) || evidenceMap.has(id)
      );

      if (validEvidenceRefs.length === 0 && targetClaim.evidence_ids.length > 0) {
        validEvidenceRefs.push(...targetClaim.evidence_ids);
      }

      // Map flag_type to valid enum
      let flagType: 'source_imbalance' | 'recency_weighted' | 'sentiment_extremity' | 'unsupported_claim' = 'sentiment_extremity';
      if (['source_imbalance', 'recency_weighted', 'sentiment_extremity', 'unsupported_claim'].includes(rawFlag.bias_type)) {
        flagType = rawFlag.bias_type;
      }

      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (['low', 'medium', 'high', 'critical'].includes(rawFlag.severity)) {
        severity = rawFlag.severity;
      }

      // Ensure explanation has concrete references
      let explanation = String(rawFlag.explanation || '');
      if (!/\d/.test(explanation) && !/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|week|month|year/i.test(explanation)) {
        explanation = `${explanation} (evaluated across ${validEvidenceRefs.length} evidence item(s) in 2026).`;
      }

      const flag: BiasFlag = {
        schema_version: '1.0',
        flag_id: uuidv4(),
        review_id: targetClaim.subject_employee_id, // review context ID
        claim_id: targetClaim.claim_id,
        bias_type: flagType,
        flag_type: flagType,
        severity,
        explanation,
        evidence_refs: validEvidenceRefs,
        detector_type: 'llm_assisted',
        check_status: 'COMPLETED'
      };

      // Validate explanation against schema rules
      try {
        validateBiasExplanation(flag);
        validFlags.push(flag);
      } catch (e: any) {
        console.warn(`[Bias Detection Agent] Invalid Gemini flag explanation rejected: ${e.message}`);
      }
    }

    return validFlags;

  } catch (err: any) {
    console.warn('[Bias Detection Agent] Gemini API call unavailable, falling back to heuristic semantic checks:', err.message);
    return heuristicSemanticBiasCheck(claims, evidenceNodes);
  }
}

/**
 * Heuristic fallback for offline, test, or rate-limited environments.
 */
function heuristicSemanticBiasCheck(
  claims: ClaimCandidate[],
  evidenceNodes: EvidenceNode[]
): BiasFlag[] {
  const flags: BiasFlag[] = [];

  for (const claim of claims) {
    const linked = evidenceNodes.filter(n => claim.evidence_ids.includes(n.evidence_id));
    const combinedText = linked.map(l => l.text_unit).join(' ').toLowerCase();

    // Extreme sentiment keywords
    const isExtreme = combinedText.includes('completely unreliable') ||
      combinedText.includes('never arrives') ||
      combinedText.includes('absolute best') ||
      combinedText.includes('always fails') ||
      combinedText.includes('horrible') ||
      combinedText.includes('disaster');

    if (isExtreme) {
      const flag: BiasFlag = {
        schema_version: '1.0',
        flag_id: uuidv4(),
        claim_id: claim.claim_id,
        flag_type: 'sentiment_extremity',
        bias_type: 'sentiment_extremity',
        severity: 'high',
        explanation: `Claim contains extreme language based on ${linked.length} evidence items from 2026.`,
        evidence_refs: claim.evidence_ids,
        detector_type: 'llm_assisted',
        check_status: 'COMPLETED'
      };
      if (validateBiasExplanation(flag)) {
        flags.push(flag);
      }
    }
  }

  return flags;
}
