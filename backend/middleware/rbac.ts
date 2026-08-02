import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { UserRole } from '../../shared/types/common.js';

export function rbacMiddleware(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'ERR_UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const userRole = req.user.role;
    const isPermitted =
      allowedRoles.includes(userRole) ||
      (userRole === 'OWNER' && (allowedRoles.includes('HR_ADMIN') || allowedRoles.includes('MANAGER')));

    if (!isPermitted) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ERR_FORBIDDEN',
          message: `Access denied. Role ${req.user.role} is not permitted to access this resource.`
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
}
