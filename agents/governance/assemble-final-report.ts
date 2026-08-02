import { reportsRepository, reviewsRepository, auditRepository, withTransaction } from '../../backend/repositories/db.js';
import { DraftReport, FinalReport } from '../../shared/types/reports.js';
import { FinalReportSchema } from '../../shared/schemas/index.js';
import { v4 as uuidv4 } from 'uuid';

export async function assembleFinalReport(reviewCycleId: string, finalizedByUserId: string): Promise<FinalReport> {
  const existingReport = await reportsRepository.findByReviewId(reviewCycleId);
  if (!existingReport) {
    throw new Error(`ERR_GOVERNANCE_NOT_FOUND: Draft report for review cycle ${reviewCycleId} not found`);
  }

  const draft = existingReport as DraftReport;

  for (const sec of draft.sections) {
    for (const claim of sec.claims) {
      if (claim.reviewer_decision === 'PENDING') {
        throw new Error('ERR_GOVERNANCE_INCOMPLETE_REVIEW: Cannot finalize report while claims remain pending review');
      }
    }
  }

  const finalReport: FinalReport = {
    schema_version: '1.0',
    report_id: draft.report_id,
    review_cycle_id: reviewCycleId,
    review_id: reviewCycleId,
    subject_employee_id: draft.subject_employee_id,
    status: 'FINALIZED',
    finalized_at: new Date().toISOString(),
    finalized_by: finalizedByUserId,
    sections: draft.sections
  };

  FinalReportSchema.parse(finalReport);

  await withTransaction(async (client) => {
    await reportsRepository.saveOrUpdate(finalReport, client);
    await reviewsRepository.finalize(reviewCycleId, finalizedByUserId, client);
  });

  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    report_id: draft.report_id,
    review_cycle_id: reviewCycleId,
    claim_id: null,
    event_type: 'finalization' as any,
    actor: { actor_type: 'human', actor_id: finalizedByUserId },
    timestamp: new Date().toISOString(),
    before_state: { status: 'DRAFT' },
    after_state: { status: 'FINALIZED' },
    details: { action: 'Report finalized and published' }
  });

  return finalReport;
}
