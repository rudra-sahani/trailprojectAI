import { reviewsRepository, feedbackRepository, operationsQueueRepository } from '../../backend/repositories/db.js';
import { processCollectorJob } from '../collector/collector.agent.js';
import { processRetrievalJob } from '../retrieval/retrieval.agent.js';
import { processBiasDetectionJob } from '../bias_detection/bias-detection.agent.js';
import { processSynthesisJob } from '../synthesis/synthesis.agent.js';

export async function runFullPipelineForReviewCycle(reviewCycleId: string): Promise<void> {
  const cycle = await reviewsRepository.findById(reviewCycleId);
  if (!cycle) {
    throw new Error(`Review cycle ${reviewCycleId} not found`);
  }

  try {
    // Stage 1: COLLECTING
    await reviewsRepository.updateStatus(reviewCycleId, 'PIPELINE_RUNNING', 'COLLECTOR');

    const rawItems = await feedbackRepository.findByReviewId(reviewCycleId);
    for (const item of rawItems) {
      await processCollectorJob({
        review_id: reviewCycleId,
        raw_feedback_id: item.id,
        subject_employee_id: cycle.employee_id,
        source_type: item.source_type,
        author_role: item.submitted_by === cycle.employee_id ? 'self' : (item.submitted_by === cycle.manager_id ? 'manager' : 'peer'),
        author_id: item.submitted_by,
        submitted_at: item.submitted_at,
        raw_text: item.content
      });
    }

    // Stage 2: RETRIEVAL
    await reviewsRepository.updateStatus(reviewCycleId, 'PIPELINE_RUNNING', 'RETRIEVAL');
    await processRetrievalJob(reviewCycleId, cycle.employee_id);

    // Stage 3: BIAS_CHECKING
    await reviewsRepository.updateStatus(reviewCycleId, 'PIPELINE_RUNNING', 'BIAS');
    await processBiasDetectionJob(reviewCycleId, cycle.employee_id);

    // Stage 4: SYNTHESIS
    await reviewsRepository.updateStatus(reviewCycleId, 'PIPELINE_RUNNING', 'SYNTHESIS');
    await processSynthesisJob(reviewCycleId, cycle.employee_id);

    // Stage 5: HUMAN_REVIEW
    await reviewsRepository.updateStatus(reviewCycleId, 'HUMAN_REVIEW', 'SYNTHESIS');
  } catch (err: any) {
    console.error(`[Pipeline Error] Cycle ${reviewCycleId} failed:`, err);
    await reviewsRepository.updateStatus(reviewCycleId, 'ESCALATED', 'FAILED');

    await operationsQueueRepository.create({
      id: `op-${Date.now()}`,
      review_id: reviewCycleId,
      failed_stage: cycle.pipeline_stage || 'UNKNOWN',
      failure_reason: err.message || 'Pipeline processing error',
      retry_count: 1,
      assigned_to: null,
      status: 'OPEN',
      created_at: new Date().toISOString()
    });

    throw err;
  }
}
