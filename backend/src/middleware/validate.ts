import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

// ── Run validation chains then return 400 if any fail ────────
export function validate(chains: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all chains in parallel
    await Promise.all(chains.map(chain => chain.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(e => ({ field: (e as any).path, message: e.msg })),
      });
      return;
    }
    next();
  };
}
