# Human Reviewer Workflow Specification

This document details the step-by-step workflow for managers reviewing AI-generated performance review drafts in VeriReview AI.

## Reviewer Actions
1. **Inspect Draft Report:** Review section by section (`strengths`, `growth_areas`, `impact_highlights`, `goal_progress`).
2. **Examine Evidence & Bias Flags:** Every claim displays its confidence score, supporting evidence links, and any detected bias flags.
3. **Per-Claim Decision:**
   - **Accept:** Approve claim as-is.
   - **Edit:** Provide a human override text. The original AI text is preserved in history.
   - **Reject:** Remove claim with a mandatory reason explanation.
4. **Bias Flag Acknowledgment:** Claims with High or Critical severity bias flags require explicit reviewer acknowledgment before approval.
5. **Finalize:** The report can only be finalized when **ALL** claim decisions are non-PENDING.
