import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'AI_STUDIO_KEY_STUB'
});

export interface GeminiThemeCluster {
  theme: string;
  evidence_ids: string[];
  summary: string;
}

let promptCache: string | null = null;

function getRetrievalPrompt(): string {
  if (promptCache) return promptCache;
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'retrieval_v2.md');
    if (fs.existsSync(promptPath)) {
      promptCache = fs.readFileSync(promptPath, 'utf-8');
      return promptCache;
    }
  } catch (err) {
    console.warn('[Retrieval Agent] Could not load retrieval_v2.md, using default prompt instruction');
  }
  return `You are the Evidence Retrieval Agent in VeriReview AI. Group the provided evidence items into grounded performance themes. Every theme MUST be backed by evidence_ids from input. Return JSON with key "themes".`;
}

export async function clusterEvidenceWithGemini(
  evidenceNodes: Array<{
    evidence_id: string;
    source_type: string;
    author_role: string;
    submitted_at: string;
    text_unit: string;
    tags: string[];
  }>,
  options?: { simulateFailure?: boolean; simulateTimeout?: boolean }
): Promise<GeminiThemeCluster[]> {
  if (options?.simulateFailure) {
    throw new Error('ERR_RETRIEVAL_SIMULATED_GEMINI_FAILURE: Simulated Gemini API failure for Retrieval Agent');
  }

  if (options?.simulateTimeout) {
    throw new Error('ERR_RETRIEVAL_TIMEOUT: Gemini API request timed out');
  }

  if (evidenceNodes.length === 0) {
    return [];
  }

  const validIds = new Set(evidenceNodes.map(n => n.evidence_id));

  // Fallback if no real Gemini API Key is provided
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || process.env.GEMINI_API_KEY === 'AI_STUDIO_KEY_STUB') {
    return heuristicClustering(evidenceNodes);
  }

  const systemInstruction = getRetrievalPrompt();

  const formattedNodes = evidenceNodes.map(n => ({
    evidence_id: n.evidence_id,
    source_type: n.source_type,
    author_role: n.author_role,
    submitted_at: n.submitted_at,
    text_unit: n.text_unit,
    tags: n.tags
  }));

  let responseText = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Analyze the following performance evidence items and group them into coherent performance themes.\n\nEvidence Items:\n${JSON.stringify(formattedNodes, null, 2)}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: {
              type: Type.ARRAY,
              description: 'Array of performance theme clusters grounded in evidence.',
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: {
                    type: Type.STRING,
                    description: 'Coherent performance theme title (e.g. Leadership, Technical Execution).'
                  },
                  evidence_ids: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'List of supporting evidence_ids from input.'
                  },
                  summary: {
                    type: Type.STRING,
                    description: 'Concise summary of observation grounded in the supporting evidence.'
                  }
                },
                required: ['theme', 'evidence_ids', 'summary']
              }
            }
          },
          required: ['themes']
        }
      }
    });

    responseText = response.text?.trim() || '';
  } catch (err: any) {
    console.warn('[Retrieval Agent] Gemini API call unavailable, falling back to heuristic clustering:', err.message);
    return heuristicClustering(evidenceNodes);
  }

  if (!responseText) {
    throw new Error('ERR_RETRIEVAL_EMPTY_GEMINI_RESPONSE: Gemini returned an empty response');
  }

  try {
    const parsed = JSON.parse(responseText);
    const rawThemes: GeminiThemeCluster[] = Array.isArray(parsed.themes) ? parsed.themes : [];

    // STRICT GROUNDING FILTER: Retain only evidence_ids that exist in the input evidence nodes
    const groundedClusters: GeminiThemeCluster[] = [];
    for (const item of rawThemes) {
      if (!item.theme || !Array.isArray(item.evidence_ids)) continue;

      const groundedIds = item.evidence_ids.filter(id => validIds.has(id));
      if (groundedIds.length > 0) {
        groundedClusters.push({
          theme: item.theme.trim(),
          evidence_ids: groundedIds,
          summary: item.summary ? item.summary.trim() : item.theme.trim()
        });
      }
    }

    return groundedClusters;
  } catch (err: any) {
    throw new Error(`ERR_RETRIEVAL_INVALID_JSON: Failed to parse Gemini response: ${err.message}`);
  }
}

function heuristicClustering(
  nodes: Array<{
    evidence_id: string;
    source_type: string;
    author_role: string;
    submitted_at: string;
    text_unit: string;
    tags: string[];
  }>
): GeminiThemeCluster[] {
  const groups: Record<string, typeof nodes> = {};

  nodes.forEach(node => {
    const tagsStr = (node.tags || []).join(' ').toLowerCase();
    let themeName = 'Execution & Performance Impact';

    if (tagsStr.includes('lead') || tagsStr.includes('architect') || tagsStr.includes('ownership')) {
      themeName = 'Technical Leadership & Architecture';
    } else if (tagsStr.includes('collab') || tagsStr.includes('peer') || tagsStr.includes('mentor') || tagsStr.includes('communication')) {
      themeName = 'Collaboration & Team Impact';
    } else if (tagsStr.includes('deliver') || tagsStr.includes('technical') || tagsStr.includes('quality')) {
      themeName = 'Technical Execution & Quality';
    }

    if (!groups[themeName]) groups[themeName] = [];
    groups[themeName].push(node);
  });

  return Object.entries(groups).map(([theme, items]) => ({
    theme,
    evidence_ids: items.map(i => i.evidence_id),
    summary: items.map(i => i.text_unit).join(' ')
  }));
}
