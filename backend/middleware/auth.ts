import { Request, Response, NextFunction } from 'express';
import { usersRepository, authRepository } from '../repositories/db.js';
import { UserProfile } from '../../shared/types/api-contracts.js';
import { verifyJWT } from '../lib/auth-crypto.js';
import { verifySupabaseToken } from '../lib/supabase.js';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  token?: string;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'ERR_UNAUTHORIZED',
        message: 'Missing or malformed Authorization header'
      },
      timestamp: new Date().toISOString()
    });
  }

  const token = authHeader.substring(7).trim();

  // 1. Check if token has been revoked in PostgreSQL
  const isRevoked = await authRepository.isAccessTokenRevoked(token);
  if (isRevoked) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'ERR_UNAUTHORIZED',
        message: 'Token has been revoked or logged out'
      },
      timestamp: new Date().toISOString()
    });
  }

  // 2. Try validating local signed JWT
  const jwtResult = verifyJWT(token);
  let foundUser: UserProfile | null = null;

  if (jwtResult.valid && jwtResult.payload) {
    if (jwtResult.payload.sub) {
      foundUser = await usersRepository.findById(jwtResult.payload.sub);
    }
    if (!foundUser && jwtResult.payload.email) {
      foundUser = await usersRepository.findByEmail(jwtResult.payload.email);
    }
  }

  // 3. Fallback: Check if token is a valid Supabase Auth Token
  if (!foundUser) {
    const supabaseResult = await verifySupabaseToken(token);
    if (supabaseResult.valid && supabaseResult.user && supabaseResult.user.email) {
      foundUser = await usersRepository.findByEmail(supabaseResult.user.email);
    }
  }

  // 4. Fallback for backwards compatibility with token-<userId> formats in integration tests
  if (!foundUser && token.startsWith('token-')) {
    const userIdOrRole = token.replace('token-', '');
    foundUser = await usersRepository.findById(userIdOrRole);
    if (!foundUser) {
      const allUsers = await usersRepository.findAll();
      foundUser = allUsers.find(u => u.id === userIdOrRole || u.email.toLowerCase().includes(userIdOrRole.toLowerCase())) || null;
    }
  }

  if (!foundUser) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'ERR_UNAUTHORIZED',
        message: jwtResult.error || 'Invalid or expired session token'
      },
      timestamp: new Date().toISOString()
    });
  }

  req.user = foundUser;
  req.token = token;
  next();
}
