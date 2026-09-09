import { Request, Response, NextFunction } from "express";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const clientRequests = new Map<string, { count: number; resetAt: number }>();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of clientRequests.entries()) {
    if (now > entry.resetAt) {
      clientRequests.delete(key);
    }
  }
}

setInterval(cleanup, RATE_LIMIT_WINDOW_MS).unref();

export function withRateLimit(req: Request, res: Response, next: NextFunction) {
  const clientIp =
    req.ip ||
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    "unknown";

  const now = Date.now();
  const entry = clientRequests.get(clientIp);

  if (!entry || now > entry.resetAt) {
    clientRequests.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }

  entry.count++;

  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: "Too many requests, please try again later",
    });
  }

  return next();
}
