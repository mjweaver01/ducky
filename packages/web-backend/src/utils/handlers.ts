import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';

type AsyncRouteHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wraps an async route handler so that any thrown error is forwarded to
 * Express's next(err) — picked up by the global error-handler in index.ts.
 * Eliminates the repetitive try/catch in every route.
 */
export const asyncHandler =
  (fn: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req as AuthRequest, res, next)).catch(next);
  };

/**
 * Asserts that a DB record exists and belongs to the current user.
 * Writes a 404 and returns false if the check fails so the caller can `return`.
 *
 * Usage:
 *   const record = await repo.findById(id);
 *   if (!assertOwned(record, req.user!.id, res, 'Token')) return;
 *   // record is narrowed to T (non-null) here
 */
export function assertOwned<T extends { user_id: string }>(
  record: T | null,
  userId: string,
  res: Response,
  label: string
): record is T {
  if (!record || record.user_id !== userId) {
    res.status(404).json({ error: `${label} not found` });
    return false;
  }
  return true;
}
