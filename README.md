# VeriReview AI — Bias-Aware 360° Performance Review Intelligence System

VeriReview AI is an enterprise-grade performance review platform that enables organizations to conduct fair, transparent, explainable, and evidence-backed employee evaluations through a multi-agent AI workflow, while ensuring that human managers retain authority over final decisions.

## Architecture Highlights
- **Full-Stack Architecture:** React (Vite) frontend + Node.js Express backend + PostgreSQL database layer.
- **5-Agent AI Pipeline:** Collector $\rightarrow$ Evidence Retrieval $\rightarrow$ Bias Detection $\rightarrow$ Synthesis $\rightarrow$ Human Review $\rightarrow$ Governance & Audit.
- **Evidence Grounding:** Every claim is linked to specific source evidence nodes.
- **Explainable Bias Detection:** 4 sub-checks (source imbalance, recency weighting, sentiment extremity, unsupported claims).
- **Human-in-the-Loop:** Per-claim approval, editing, and rejection. Reports cannot be finalized with pending claims.
- **Immutable Audit Trail:** Append-only audit history of all agent runs and human decisions.

## Architecture Documents
- [CONTEXT.md](./docs/environment.md)
- [REQUIREMENTS.md](./REQUIREMENTS.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
- [API_SPEC.md](./API_SPEC.md)
- [UI_SPEC.md](./UI_SPEC.md)
- [TASKS.md](./TASKS.md)
- [AI_AGENT_ARCHITECTURE.md](./docs/roles.md)
- [AGENT_PROTOCOL.md](./docs/redaction-policy.md)

## Getting Started

1. Copy `.env.example` to `.env`
2. Run development server:
```bash
npm run dev
```
3. Access the web interface at `http://localhost:3000`
