# Coverage Confidence Scoring Formula

The **Coverage Confidence Score** (0.0 to 1.0) measures how well-evidenced and balanced a candidate claim theme is before it is synthesized into a performance report.

## Formula Components

The score is calculated deterministically as a weighted composite of three factors:

$$\text{Coverage Confidence} = (0.4 \times \text{Source Volume Score}) + (0.4 \times \text{Role Diversity Score}) + (0.2 \times \text{Recency Score})$$

### 1. Source Volume Score ($V$)
- $V = \min(1.0, \text{evidence\_count} / 4)$
- Maximum score reached at 4+ distinct evidence items.

### 2. Role Diversity Score ($D$)
- Evaluates representation across **Self**, **Peer**, and **Manager** sources.
- 3 role types represented $\rightarrow 1.0$
- 2 role types represented $\rightarrow 0.65$
- 1 role type represented $\rightarrow 0.30$

### 3. Recency Score ($R$)
- Measures temporal distribution across the review period.
- Items spread across multiple months $\rightarrow 1.0$
- Items clustered in a single 2-week window $\rightarrow 0.5$

## Mandatory 0.3 Floor Rule
- **Hard Constraint:** If $\text{Coverage Confidence} < 0.30$, the status is forcibly set to `INSUFFICIENT_EVIDENCE`.
- Such themes are flagged as explicit evidence gaps rather than synthesized into unsupported claims.
