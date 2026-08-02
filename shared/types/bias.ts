import { Severity } from './common.js';

export interface BiasFlag {
  schema_version: '1.0';
  flag_id: string;
  review_id?: string;
  claim_id: string;
  bias_type?: string;
  flag_type: 'source_imbalance' | 'recency_weighted' | 'sentiment_extremity' | 'unsupported_claim';
  severity: Severity;
  explanation: string;
  evidence_refs: string[];
  detector_type: 'deterministic' | 'llm_assisted';
  check_status: 'COMPLETED' | 'CHECK_UNAVAILABLE';
}
