# Database Migration & Approval Workflow

This document defines the process for drafting, reviewing, and applying database migrations in VeriReview AI.

## Migration Process
1. **Drafting:** Roo Code drafts migration files in `database/migrations/` (e.g. `001_initial_schema.sql`).
2. **Justification:** Every migration file must include SQL comments explaining table constraints, foreign keys, indexes, or Row-Level Security (RLS) policies.
3. **Human Review:** No migration is executed on staging or production databases without mandatory Human review and sign-off.
4. **Execution:** Migrations are executed deterministically using SQL runner scripts (`database/run-migrations.ts` or Supabase CLI).
