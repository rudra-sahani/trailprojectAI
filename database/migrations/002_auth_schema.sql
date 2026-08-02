-- Migration: 002_auth_schema.sql
-- Description: Production Authentication Schema for VeriReview AI
-- Author: VeriReview Engineering
-- Justification: Implements persistent user credentials, email verification codes, refresh tokens, and rate limiting logs per security policy.

-- User Credentials Table
CREATE TABLE IF NOT EXISTS user_credentials (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  is_email_verified BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email Verifications Table
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Refresh Tokens Table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Revoked Access Tokens Table
CREATE TABLE IF NOT EXISTS revoked_access_tokens (
  id TEXT PRIMARY KEY,
  token_jti TEXT UNIQUE NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Login Rate Limiting & Audit Table
CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT PRIMARY KEY,
  failed_count INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast auth token lookup & verification code matching
CREATE INDEX IF NOT EXISTS idx_email_verifications_match ON email_verifications(email, code, type);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
