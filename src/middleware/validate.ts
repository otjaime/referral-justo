import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Validation failed', err.issues);
      }
      throw err;
    }
  };
}

export function validateParams(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as Record<string, string>;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Invalid parameters', err.issues);
      }
      throw err;
    }
  };
}

export function validateQuery(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as Record<string, string>;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        throw new ValidationError('Invalid query parameters', err.issues);
      }
      throw err;
    }
  };
}
