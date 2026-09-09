import { Request, Response, NextFunction } from "express";

export function withAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  // TODO: validate token against your auth provider
  // For now, attach a placeholder user if token is present
  (req as any).user = { token };

  return next();
}
