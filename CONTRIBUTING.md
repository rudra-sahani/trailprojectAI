# Contributing & Repository Ownership Rules

To ensure structural integrity and prevent conflicting edits across agent sessions and AI tools, VeriReview AI strictly enforces file and directory ownership rules.

## One Tool, One Directory Rule

| Directory | Primary Owner | Secondary Reviewer | Allowed Editors |
|---|---|---|---|
| `frontend/` | v0 | Roo Code | v0, Roo Code |
| `backend/` | Gemini CLI | Kilo Code | Gemini CLI, Roo Code |
| `agents/` | Roo Code | Kilo Code / Human | Roo Code, Gemini CLI |
| `shared/` | Roo Code | Human | Roo Code |
| `database/` | Roo Code (drafts) | Human (Mandatory) | Roo Code, Human |
| `components/` | v0 | Roo Code | v0 |
| `prompts/` | Human | Roo Code | Human, Roo Code (draft) |
| `docs/` | Human | Aider | Human |

## Core Conventions
1. **Never edit the same file across multiple tools in the same session.** Commit first, then hand off.
2. **Strict TypeScript & Schema Validation:** Every payload written to or read from the database must pass Zod schema validation.
3. **No Direct Agent-to-Agent Network Calls:** All agent communication is store-and-forward through database state.
