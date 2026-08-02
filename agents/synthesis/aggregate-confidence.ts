import { ReportSection } from '../../shared/types/reports.js';

export function calculateOverallConfidence(sections: ReportSection[]): number {
  let totalConf = 0;
  let count = 0;

  for (const sec of sections) {
    for (const claim of sec.claims) {
      if (typeof claim.confidence === 'number') {
        totalConf += claim.confidence;
        count++;
      }
    }
  }

  if (count === 0) return 0.50;
  const avg = totalConf / count;
  return Math.round(avg * 100) / 100;
}
