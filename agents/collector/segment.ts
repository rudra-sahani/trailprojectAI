import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'AI_STUDIO_KEY_STUB',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

let cachedPrompt: string | null = null;
function getCollectorPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  try {
    const promptPath = path.join(process.cwd(), 'prompts', 'collector_v2.md');
    if (fs.existsSync(promptPath)) {
      cachedPrompt = fs.readFileSync(promptPath, 'utf-8');
      return cachedPrompt;
    }
  } catch {
    // fallback if file not readable
  }
  return `You are the Collector Agent in VeriReview AI. Normalize raw employee performance feedback into atomic, claim-worthy text units (<=2000 chars each) and tags. Do NOT summarize or evaluate. Preserve original meaning. Return a JSON array.`;
}

export interface SegmentContext {
  source_type?: string;
  author_role?: string;
  simulateFailure?: boolean;
}

export async function segmentTextIntoUnits(
  rawText: string,
  context?: SegmentContext
): Promise<Array<{ text_unit: string; tags: string[] }>> {
  if (!rawText || rawText.trim() === '') {
    throw new Error('ERR_COLLECTOR_EMPTY_TEXT: Cannot segment empty text');
  }

  if (context?.simulateFailure) {
    throw new Error('ERR_COLLECTOR_SIMULATED_GEMINI_FAILURE: Simulated Gemini API failure');
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || process.env.GEMINI_API_KEY === 'AI_STUDIO_KEY_STUB') {
    const sentences = rawText.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const units = sentences.length > 0 ? sentences : [rawText.trim()];
    return units.map(u => ({
      text_unit: u.slice(0, 1999),
      tags: ['performance', 'general']
    }));
  }

  const systemInstruction = getCollectorPrompt();

  let responseText = '';
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Normalize the following employee performance feedback into atomic evidence text units according to the rules.\n\nContext:\n- Source Type: ${context?.source_type || 'unspecified'}\n- Author Role: ${context?.author_role || 'unspecified'}\n\nFeedback Text:\n"${rawText}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          description: 'Array of normalized atomic evidence units extracted directly from feedback text.',
          items: {
            type: Type.OBJECT,
            properties: {
              text_unit: {
                type: Type.STRING,
                description: 'Atomic performance claim or observation extracted directly from feedback (<=2000 chars).'
              },
              tags: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING
                },
                description: 'Applicable tags (e.g. leadership, technical, collaboration, delivery, communication, general).'
              }
            },
            required: ['text_unit', 'tags']
          }
        }
      }
    });
    responseText = response.text?.trim() || '';
  } catch (err) {
    console.warn('[Collector Segment] Gemini API call unavailable, falling back to heuristic segmentation:', err);
    const sentences = rawText.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
    const units = sentences.length > 0 ? sentences : [rawText.trim()];
    return units.map(u => ({
      text_unit: u.slice(0, 1999),
      tags: ['performance', 'general']
    }));
  }

  const jsonStr = responseText;
  if (!jsonStr) {
    throw new Error('ERR_COLLECTOR_EMPTY_GEMINI_RESPONSE: Gemini returned an empty response');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (err: any) {
    throw new Error(`ERR_COLLECTOR_MALFORMED_JSON: Gemini output is not valid JSON: ${jsonStr}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('ERR_COLLECTOR_INVALID_SCHEMA: Gemini response is not a JSON array');
  }

  if (parsed.length === 0) {
    throw new Error('ERR_COLLECTOR_ZERO_UNITS: Gemini produced 0 text units for non-empty text');
  }

  const results: Array<{ text_unit: string; tags: string[] }> = [];

  for (const item of parsed) {
    if (!item || typeof item.text_unit !== 'string' || item.text_unit.trim() === '') {
      throw new Error('ERR_COLLECTOR_INVALID_UNIT: Extracted text_unit is missing or empty');
    }
    const text_unit = item.text_unit.trim().slice(0, 1999);
    const tags = Array.isArray(item.tags) && item.tags.length > 0
      ? item.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : ['general'];

    results.push({
      text_unit,
      tags: tags.length > 0 ? tags : ['general']
    });
  }

  return results;
}
