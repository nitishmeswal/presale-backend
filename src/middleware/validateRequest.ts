import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/AppError';

/**
 * Middleware to validate request body/query/params against Zod schema
 */
export const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        
        return next(new ValidationError(
          `Validation failed: ${errorMessages.map((e: any) => `${e.field}: ${e.message}`).join(', ')}`
        ));
      }
      next(error);
    }
  };
};
