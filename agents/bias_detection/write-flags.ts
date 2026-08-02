import { biasRepository } from '../../backend/repositories/db.js';
import { BiasFlag } from '../../shared/types/bias.js';
import { validateBiasExplanation } from './validate-explanation.js';

export async function writeBiasFlag(flag: BiasFlag, reviewId?: string): Promise<BiasFlag> {
  validateBiasExplanation(flag);
  return await biasRepository.create(flag, reviewId);
}
