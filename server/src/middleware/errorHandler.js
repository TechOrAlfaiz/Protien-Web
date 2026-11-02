import { ZodError } from 'zod';

export const wrap = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function errorHandler(err, req, res, next) {
  // If response has already started sending
  if (res.headersSent) {
    return next(err);
  }

  // 1. Zod schema validation errors
  if (err instanceof ZodError) {
    const message = err.issues.map(i => i.message).join('. ');
    return res.status(400).json({
      error: message || 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    });
  }

  // 2. Mongoose Invalid ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid identifier format for ${err.path}`,
      code: 'INVALID_ID'
    });
  }

  // 3. Mongoose Validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message).join('. ');
    return res.status(400).json({
      error: messages,
      code: 'SCHEMA_VALIDATION_ERROR'
    });
  }

  // 4. MongoDB Duplicate Key (code 11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || err.keyValue || {});
    const field = keys[0] || 'field';
    return res.status(409).json({
      error: `A record with this ${field} already exists`,
      code: 'DUPLICATE_KEY',
      field
    });
  }

  // 5. JWT Authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Session expired or invalid. Please sign in again.',
      code: 'UNAUTHORIZED'
    });
  }

  // 6. Custom or operational errors
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An unexpected internal error occurred';

  if (statusCode >= 500) {
    console.error(`💥 Server Exception [${req.method} ${req.url}]:`, err);
  }

  return res.status(statusCode).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR'
  });
}

