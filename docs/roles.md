# Role-Based Access Control (RBAC) & Permission Matrix

VeriReview AI supports four distinct system roles: **EMPLOYEE**, **MANAGER**, **HR_ADMIN**, and **SYSTEM**.

## Permission Matrix

| Role | View Access | Submission Actions | Review / Decision Actions | Audit & Admin Access |
|---|---|---|---|---|
| **EMPLOYEE** | Own finalized reports, own submitted feedback, own review progress | Self-assessment, Peer feedback | None (cannot edit or approve claims) | None |
| **MANAGER** | Direct team member reviews, team draft & final reports, team evidence | Manager feedback, Goals, Project outcomes, Meeting notes | Accept, edit, reject claim candidates; finalize team reports | Team-level review progress |
| **HR_ADMIN** | All employees, all review cycles, all draft & final reports | All feedback types | All review actions + Reopen review cycle | Full immutable audit log, Ingestion Issues queue, Ops Queue, System agents health |
| **SYSTEM** | Pipeline execution scope | Automated normalized evidence creation | AI Agent pipeline processing | Immutable audit trail generation |

## Isolation & Enforcement
- Enforced at both the Express API middleware layer (`backend/middleware/rbac.ts`) and database Row-Level Security (RLS) policies.
- Direct API calls attempting cross-employee access outside role scope return HTTP `403 Forbidden`.
