import { DraftReport, FinalReport } from '../../shared/types/reports.js';

export function redactPeerFeedbackQuotes<T extends DraftReport | FinalReport>(
  report: T,
  requestorRole: string,
  requestorId: string
): T {
  // Deep clone report
  const cloned = JSON.parse(JSON.stringify(report)) as T;

  if (requestorRole === 'EMPLOYEE') {
    // Redact verbatim peer quotes from employee view
    cloned.sections.forEach(sec => {
      sec.claims.forEach(claim => {
        // Redact individual author identifiers if present
        if (claim.reviewer_comment) {
          claim.reviewer_comment = '[REDACTED_FOR_ANONYMITY]';
        }
      });
    });
  }

  return cloned;
}
