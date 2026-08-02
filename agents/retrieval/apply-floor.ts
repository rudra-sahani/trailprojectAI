export function applyCoverageFloor(confidence: number): 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE' {
  if (confidence < 0.30) {
    return 'INSUFFICIENT_EVIDENCE';
  }
  return 'SUFFICIENT';
}
