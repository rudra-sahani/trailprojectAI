export function calculateCoverageConfidence(
  evidenceNodes: Array<{ author_role: string; submitted_at: string }>
): { confidence: number; roleDiversity: { self: number; peer: number; manager: number } } {
  const roleDiversity = { self: 0, peer: 0, manager: 0 };
  evidenceNodes.forEach(node => {
    if (node.author_role === 'self') roleDiversity.self++;
    else if (node.author_role === 'peer') roleDiversity.peer++;
    else if (node.author_role === 'manager') roleDiversity.manager++;
  });

  const count = evidenceNodes.length;
  if (count === 0) {
    return { confidence: 0.0, roleDiversity };
  }

  // 1. Source Volume Score V (max at 4+ items)
  const volumeScore = Math.min(1.0, count / 4);

  // 2. Role Diversity Score D
  const rolesPresent = [roleDiversity.self > 0, roleDiversity.peer > 0, roleDiversity.manager > 0].filter(Boolean).length;
  let diversityScore = 0.30;
  if (rolesPresent === 3) diversityScore = 1.0;
  else if (rolesPresent === 2) diversityScore = 0.65;

  // 3. Recency Score R
  let recencyScore = 0.85;
  if (count > 1) {
    const timestamps = evidenceNodes
      .map(n => new Date(n.submitted_at).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);

    if (timestamps.length > 1) {
      const minTime = timestamps[0];
      const maxTime = timestamps[timestamps.length - 1];
      const timeDiffDays = (maxTime - minTime) / (1000 * 60 * 60 * 24);

      if (timeDiffDays > 45) {
        // Items spread across multiple months
        recencyScore = 1.0;
      } else if (timeDiffDays <= 14) {
        // Clustered in a single 2-week window
        recencyScore = 0.5;
      } else {
        recencyScore = 0.85;
      }
    }
  }

  const rawConfidence = (0.4 * volumeScore) + (0.4 * diversityScore) + (0.2 * recencyScore);
  const confidence = Math.round(Math.min(1.0, Math.max(0.0, rawConfidence)) * 100) / 100;

  return { confidence, roleDiversity };
}
