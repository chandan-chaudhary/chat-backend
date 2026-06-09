import { NextFunction, Response } from 'express';
import { aj } from '../config/arcjet';
import { AuthRequest } from './auth.middleware';
import { slidingWindow } from '@arcjet/node';
import logger from '../config/logger';

export const securityMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user?.userId;
    let limit;
    // let message;
    if (user) {
      limit = 10; // Higher limit for authenticated users
      // message = 'Authenticated user request';
    } else {
      limit = 5; // Lower limit for unauthenticated users
      // message = 'Unauthenticated user request';
    }
    const client = aj.withRule(
      slidingWindow({ mode: 'LIVE', interval: '1m', max: limit })
    );

    const decision = await client.protect(req);

    // Handling bot detection separately to provide a specific response
    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn(
        `Bot detected: - IP: ${req.ip}, User-Agent: ${req.get('user-agent')}, path: ${req.path}`
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Automated requests were blocked by security measures.',
      });
    }
    // Handle shield triggers separately to provide a specific response
    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn(
        `Shield triggered: - IP: ${req.ip}, User-Agent: ${req.get('user-agent')}, path: ${req.path}, method: ${req.method}`
      );
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your request was blocked by security policy.',
      });
    }

    // Handle rate limiting separately to provide a specific response
    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn(
        `Rate limit exceeded: - IP: ${req.ip}, User-Agent: ${req.get('user-agent')}, path: ${req.path}`
      );
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit for this endpoint.',
      });
    }

    next();
  } catch (e) {
    console.error('Security inspection failed:', e);
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Your request was blocked by security measures.',
    });
  }
};
