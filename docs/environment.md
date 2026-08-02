# Environment Variables & Configuration

This document specifies the required environment variables for VeriReview AI across development, testing, and Cloud Run production runtime environments.

## Environment Variables

| Variable Name | Description | Required | Example / Default |
|---|---|---|---|
| `GEMINI_API_KEY` | Server-side API key for Google Gemini API models | Yes | `MY_GEMINI_API_KEY` |
| `APP_URL` | Cloud Run hosted URL or local dev URL | Yes | `http://localhost:3000` |
| `SUPABASE_URL` | Supabase project URL for Auth & Database | Optional | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase public anonymous API key | Optional | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase administrative service role key | Optional | `eyJ...` |
| `JWT_SECRET` | Secret key used for local JWT verification | Yes | `super-secret-jwt-key` |
| `NODE_ENV` | Runtime environment mode | No | `development` / `production` |

## Security Policy

1. Secrets must **never** be committed to the repository.
2. The Gemini API key is used exclusively on the server side (`server.ts` and `agents/`) and is **never** exposed to browser bundles.
