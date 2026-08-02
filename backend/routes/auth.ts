import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { usersRepository, authRepository, auditRepository, withTransaction } from '../repositories/db.js';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  generateVerificationCode,
  generateOpaqueToken
} from '../lib/auth-crypto.js';
import { UserRole } from '../../shared/types/common.js';

const router = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000;

async function checkLoginLockout(email: string): Promise<{ locked: boolean; message?: string }> {
  const record = await authRepository.getLoginAttempt(email.toLowerCase());
  if (!record) return { locked: false };

  if (record.lockedUntil) {
    const lockTime = new Date(record.lockedUntil).getTime();
    if (Date.now() < lockTime) {
      const remainingMins = Math.ceil((lockTime - Date.now()) / 60000);
      return {
        locked: true,
        message: `Account temporarily locked due to excessive failed attempts. Please try again in ${remainingMins} minute(s).`
      };
    } else {
      await authRepository.resetLoginAttempts(email.toLowerCase());
    }
  }

  return { locked: false };
}

async function recordFailedLogin(email: string) {
  const key = email.toLowerCase();
  const current = (await authRepository.getLoginAttempt(key)) || { email: key, failedCount: 0 };
  const newCount = current.failedCount + 1;
  let lockedUntil: string | null = null;

  if (newCount >= MAX_LOGIN_ATTEMPTS) {
    lockedUntil = new Date(Date.now() + LOCKOUT_TIME_MS).toISOString();
  }

  await authRepository.recordFailedLogin(key, newCount, lockedUntil);
}

async function recordSuccessfulLogin(email: string) {
  await authRepository.resetLoginAttempts(email.toLowerCase());
}

async function addAuditEntry(event: {
  actor_id?: string;
  actor_type: string;
  event_type: any;
  metadata?: Record<string, any>;
}) {
  await auditRepository.addEntry({
    schema_version: '1.0',
    log_id: uuidv4(),
    actor_id: event.actor_id || null,
    actor_type: event.actor_type as any,
    event_type: event.event_type as any,
    created_at: new Date().toISOString(),
    metadata: event.metadata || {}
  });
}

// --------------------------------------------------------------------------
// POST /api/v1/auth/signup
// --------------------------------------------------------------------------
router.post('/signup', async (req, res) => {
  const { email, password, full_name, role, job_title, department_name } = req.body;

  if (!email || !password || !full_name) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Email, password, and full_name are required' },
      timestamp: new Date().toISOString()
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Password must be at least 8 characters long' },
      timestamp: new Date().toISOString()
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const existingUser = await usersRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: { code: 'ERR_DUPLICATE_EMAIL', message: 'An account with this email already exists' },
      timestamp: new Date().toISOString()
    });
  }

  const userId = uuidv4();
  const userRole: UserRole = role || 'EMPLOYEE';
  const empCode = `EMP-${Math.floor(100 + Math.random() * 900)}`;

  const verificationCode = generateVerificationCode();

  const { newUser, verificationRecord } = await withTransaction(async (client) => {
    const createdUser = await usersRepository.create(
      {
        id: userId,
        employee_code: empCode,
        full_name: String(full_name).trim(),
        email: normalizedEmail,
        role: userRole,
        department_name: department_name || 'Engineering',
        job_title: job_title || (userRole === 'EMPLOYEE' ? 'Software Engineer' : userRole === 'MANAGER' ? 'Engineering Manager' : 'HR Specialist'),
        is_active: true,
        created_at: new Date().toISOString()
      },
      client
    );

    const { hash, salt } = hashPassword(password);
    await authRepository.createCredential(
      {
        userId,
        email: normalizedEmail,
        passwordHash: hash,
        salt,
        isEmailVerified: false,
        updatedAt: new Date().toISOString()
      },
      client
    );

    const vRecord = await authRepository.createEmailVerification(
      {
        id: uuidv4(),
        userId,
        email: normalizedEmail,
        code: verificationCode,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      },
      client
    );

    return { newUser: createdUser, verificationRecord: vRecord };
  });

  await addAuditEntry({
    actor_id: userId,
    actor_type: 'USER',
    event_type: 'SIGNUP',
    metadata: { email: normalizedEmail, role: userRole }
  });

  return res.status(201).json({
    success: true,
    data: {
      user: newUser,
      verificationRequired: true,
      verificationCode,
      message: 'Registration successful. Please enter the 6-digit verification code sent to your email.'
    },
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/verify-email
// --------------------------------------------------------------------------
router.post('/verify-email', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Email and verification code are required' },
      timestamp: new Date().toISOString()
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const verification = await authRepository.findValidVerification(normalizedEmail, String(code).trim(), 'EMAIL_VERIFICATION');

  if (!verification) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_INVALID_CODE', message: 'Invalid or already used verification code' },
      timestamp: new Date().toISOString()
    });
  }

  await withTransaction(async (client) => {
    await authRepository.markVerificationUsed(verification.id, client);
    await authRepository.updateCredentialVerification(verification.userId, true, client);
  });

  const user = await usersRepository.findById(verification.userId);

  const accessToken = generateJWT({ sub: verification.userId, email: normalizedEmail, role: user?.role || 'EMPLOYEE' }, 3600);
  const refreshToken = generateOpaqueToken();

  await authRepository.createRefreshToken({
    id: uuidv4(),
    userId: verification.userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    revoked: false,
    createdAt: new Date().toISOString()
  });

  await addAuditEntry({
    actor_id: verification.userId,
    actor_type: 'USER',
    event_type: 'EMAIL_VERIFIED',
    metadata: { email: normalizedEmail }
  });

  return res.json({
    success: true,
    data: {
      user,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600
    },
    message: 'Email verified successfully',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/resend-verification
// --------------------------------------------------------------------------
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Email is required' },
      timestamp: new Date().toISOString()
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await usersRepository.findByEmail(normalizedEmail);

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, a new verification code has been generated.',
      timestamp: new Date().toISOString()
    });
  }

  const verificationCode = generateVerificationCode();
  await authRepository.createEmailVerification({
    id: uuidv4(),
    userId: user.id,
    email: normalizedEmail,
    code: verificationCode,
    type: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  return res.json({
    success: true,
    data: {
      verificationCode
    },
    message: 'Verification code resent successfully',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/login
// --------------------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Email is required' },
      timestamp: new Date().toISOString()
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  const lockout = await checkLoginLockout(normalizedEmail);
  if (lockout.locked) {
    return res.status(429).json({
      success: false,
      error: { code: 'ERR_TOO_MANY_REQUESTS', message: lockout.message },
      timestamp: new Date().toISOString()
    });
  }

  const user = await usersRepository.findByEmail(normalizedEmail);

  if (!user) {
    await recordFailedLogin(normalizedEmail);
    await addAuditEntry({
      actor_type: 'SYSTEM',
      event_type: 'LOGIN_FAILED',
      metadata: { email: normalizedEmail, reason: 'USER_NOT_FOUND' }
    });

    return res.status(401).json({
      success: false,
      error: { code: 'ERR_UNAUTHORIZED', message: 'Invalid email or password' },
      timestamp: new Date().toISOString()
    });
  }

  const cred = await authRepository.findCredentialByUserId(user.id);

  if (password && cred) {
    const isValid = verifyPassword(password, cred.passwordHash, cred.salt);
    if (!isValid) {
      await recordFailedLogin(normalizedEmail);
      await addAuditEntry({
        actor_id: user.id,
        actor_type: 'USER',
        event_type: 'LOGIN_FAILED',
        metadata: { email: normalizedEmail, reason: 'INVALID_PASSWORD' }
      });

      return res.status(401).json({
        success: false,
        error: { code: 'ERR_UNAUTHORIZED', message: 'Invalid email or password' },
        timestamp: new Date().toISOString()
      });
    }
  }

  if (cred && !cred.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: { code: 'ERR_EMAIL_NOT_VERIFIED', message: 'Your email address has not been verified yet. Please enter your 6-digit code.' },
      timestamp: new Date().toISOString()
    });
  }

  await recordSuccessfulLogin(normalizedEmail);

  const accessToken = generateJWT({ sub: user.id, email: user.email, role: user.role }, 3600);
  const refreshToken = generateOpaqueToken();

  await authRepository.createRefreshToken({
    id: uuidv4(),
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    revoked: false,
    createdAt: new Date().toISOString()
  });

  await addAuditEntry({
    actor_id: user.id,
    actor_type: 'USER',
    event_type: 'LOGIN_SUCCESS',
    metadata: { email: normalizedEmail, role: user.role }
  });

  return res.json({
    success: true,
    data: {
      user,
      token: accessToken,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      role: user.role,
      expiresIn: 3600
    },
    message: 'Login successful',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/refresh-token
// --------------------------------------------------------------------------
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'RefreshToken is required' },
      timestamp: new Date().toISOString()
    });
  }

  const tokenRecord = await authRepository.findRefreshToken(refreshToken);

  if (!tokenRecord) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_UNAUTHORIZED', message: 'Invalid or expired refresh token' },
      timestamp: new Date().toISOString()
    });
  }

  const user = await usersRepository.findById(tokenRecord.userId);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_UNAUTHORIZED', message: 'User account not found' },
      timestamp: new Date().toISOString()
    });
  }

  const newAccessToken = generateJWT({ sub: user.id, email: user.email, role: user.role }, 3600);
  const newRefreshToken = generateOpaqueToken();

  await withTransaction(async (client) => {
    await authRepository.revokeRefreshToken(refreshToken, client);
    await authRepository.createRefreshToken(
      {
        id: uuidv4(),
        userId: user.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        revoked: false,
        createdAt: new Date().toISOString()
      },
      client
    );
  });

  return res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600
    },
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// --------------------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Email is required' },
      timestamp: new Date().toISOString()
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await usersRepository.findByEmail(normalizedEmail);

  if (!user) {
    return res.json({
      success: true,
      message: 'If an account exists with this email, a password reset code has been sent.',
      timestamp: new Date().toISOString()
    });
  }

  const resetCode = generateVerificationCode();
  await authRepository.createEmailVerification({
    id: uuidv4(),
    userId: user.id,
    email: normalizedEmail,
    code: resetCode,
    type: 'PASSWORD_RESET',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });

  await addAuditEntry({
    actor_id: user.id,
    actor_type: 'USER',
    event_type: 'PASSWORD_RESET_REQUESTED',
    metadata: { email: normalizedEmail }
  });

  return res.json({
    success: true,
    data: {
      resetCode
    },
    message: 'Password reset code has been generated.',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/reset-password
// --------------------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Email, reset code, and newPassword are required' },
      timestamp: new Date().toISOString()
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'New password must be at least 8 characters long' },
      timestamp: new Date().toISOString()
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const verification = await authRepository.findValidVerification(normalizedEmail, String(code).trim(), 'PASSWORD_RESET');

  if (!verification) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_INVALID_CODE', message: 'Invalid or expired password reset code' },
      timestamp: new Date().toISOString()
    });
  }

  const { hash, salt } = hashPassword(newPassword);

  await withTransaction(async (client) => {
    await authRepository.markVerificationUsed(verification.id, client);
    await authRepository.updatePassword(verification.userId, hash, salt, client);
    await authRepository.revokeAllUserRefreshTokens(verification.userId, client);
  });

  await addAuditEntry({
    actor_id: verification.userId,
    actor_type: 'USER',
    event_type: 'PASSWORD_RESET_COMPLETED',
    metadata: { email: normalizedEmail }
  });

  return res.json({
    success: true,
    message: 'Password reset successfully. You can now log in with your new password.',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/change-password
// --------------------------------------------------------------------------
router.post('/change-password', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'Current password and new password are required' },
      timestamp: new Date().toISOString()
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'ERR_VALIDATION', message: 'New password must be at least 8 characters long' },
      timestamp: new Date().toISOString()
    });
  }

  const userId = req.user!.id;
  const cred = await authRepository.findCredentialByUserId(userId);

  if (!cred || !verifyPassword(currentPassword, cred.passwordHash, cred.salt)) {
    return res.status(401).json({
      success: false,
      error: { code: 'ERR_UNAUTHORIZED', message: 'Incorrect current password' },
      timestamp: new Date().toISOString()
    });
  }

  const { hash, salt } = hashPassword(newPassword);
  await authRepository.updatePassword(userId, hash, salt);

  await addAuditEntry({
    actor_id: userId,
    actor_type: 'USER',
    event_type: 'PASSWORD_CHANGED',
    metadata: { userId }
  });

  return res.json({
    success: true,
    message: 'Password changed successfully',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// POST /api/v1/auth/logout
// --------------------------------------------------------------------------
router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    await authRepository.revokeAccessToken(req.token, expiresAt);
  }

  if (req.user) {
    await authRepository.revokeAllUserRefreshTokens(req.user.id);
    await addAuditEntry({
      actor_id: req.user.id,
      actor_type: 'USER',
      event_type: 'LOGOUT',
      metadata: { email: req.user.email }
    });
  }

  return res.json({
    success: true,
    data: null,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

// --------------------------------------------------------------------------
// GET /api/v1/auth/me
// --------------------------------------------------------------------------
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    data: req.user,
    timestamp: new Date().toISOString()
  });
});

export default router;
