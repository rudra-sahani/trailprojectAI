import { BiasFlag } from '../../shared/types/bias.js';
import { BiasFlagSchema } from '../../shared/schemas/index.js';

export function validateBiasExplanation(flag: BiasFlag): boolean {
  try {
    BiasFlagSchema.parse(flag);
    return true;
  } catch (err: any) {
    throw new Error(`ERR_BIAS_INVALID_EXPLANATION: Bias flag explanation '${flag.explanation}' failed validation: ${err.message}`);
  }
}
