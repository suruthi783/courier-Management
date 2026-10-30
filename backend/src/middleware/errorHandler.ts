import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

// ── Central error handler ─────────────────────────────────────
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const statusCode = err.statusCode ?? 500;
  const message    = err.message    ?? 'Internal server error';

  console.error(`[ERROR] ${statusCode} — ${message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

// ── 404 catch-all ─────────────────────────────────────────────
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

// ── Helper to create structured errors ───────────────────────
export function createError(message: string, statusCode = 500): AppError {
  const err: AppError = new Error(message);
  err.statusCode  = statusCode;
  err.isOperational = true;
  return err;
}
