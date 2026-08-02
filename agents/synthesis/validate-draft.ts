import { ReportSection } from '../../shared/types/reports.js';

export function validateDraftReport(sections: ReportSection[]): boolean {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('ERR_SYNTHESIS_TEMPLATE_MISMATCH: Draft report must contain section arrays');
  }

  const requiredSections = ['strengths', 'growth_areas', 'impact_highlights', 'goal_progress'];
  const presentSections = new Set(sections.map(s => s.section_type));

  for (const reqSec of requiredSections) {
    if (!presentSections.has(reqSec as any)) {
      throw new Error(`ERR_SYNTHESIS_MISSING_SECTION: Report is missing required section '${reqSec}'`);
    }
  }

  for (const sec of sections) {
    if (!sec.claims) continue;
    for (const claim of sec.claims) {
      if (!claim.evidence_ids || !Array.isArray(claim.evidence_ids) || claim.evidence_ids.length === 0) {
        throw new Error(`ERR_SYNTHESIS_UNGROUNDED_CLAIM: Claim '${claim.claim_id}' lacks evidence_ids citation`);
      }
      if (!claim.text || claim.text.trim().length === 0) {
        throw new Error(`ERR_SYNTHESIS_EMPTY_TEXT: Claim '${claim.claim_id}' has empty text`);
      }
    }
  }
  return true;
}
