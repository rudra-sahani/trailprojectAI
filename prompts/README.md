# Prompt Engineering & Versioning Conventions

All prompts utilized by AI Agents in VeriReview AI are stored in this directory as versioned Markdown files.

## Versioning Rules
1. **Never overwrite prompts in place.** Prompts are versioned sequentially (`collector_v1.md`, `collector_v2.md`, etc.).
2. **Human Final Edit Authority:** Roo Code or AI tools may draft initial prompt versions, but final sign-off is performed by Human engineering leads.
3. **Traceability:** The prompt version string used to generate each draft report is recorded on the `reports` row (`prompt_version`) for auditability.

## Prompt Directory Index
- `collector_v1.md` — Ingestion & text-unit segmentation prompt
- `retrieval_v1.md` — Evidence clustering & theme retrieval prompt
- `bias_sentiment_v1.md` — LLM-assisted sentiment-extremity check prompt
- `bias_unsupported_v1.md` — LLM-assisted unsupported-claim check prompt
- `synthesis_v1.md` — Templated draft report generation prompt
