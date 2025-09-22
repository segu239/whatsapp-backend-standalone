import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

// Tipos de errores personalizados
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'GENERIC_ERROR';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string) {
    super(`${service} service is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
    this.name = 'ServiceUnavailableError';
  }
}

export class ErrorMiddleware {
  private static logger = createLogger('ErrorMiddleware');

  /**
   * Middleware principal de manejo de errores
   */
  static handleError = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Log del error
    ErrorMiddleware.logError(error, req, requestId as string);

    // Determinar el tipo de error y respuesta apropiada
    const errorResponse = ErrorMiddleware.buildErrorResponse(error, req);

    // Enviar respuesta
    res.status(errorResponse.statusCode).json(errorResponse.body);
  };

  /**
   * Middleware para rutas no encontradas (404)
   */
  static notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    const error = new NotFoundError(`Route ${req.method} ${req.path}`);
    next(error);
  };

  /**
   * Wrapper para funciones async que automáticamente captura errores
   */
  static asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Registra el error de manera estructurada
   */
  private static logError(error: Error, req: Request, requestId: string): void {
    const errorInfo = {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'content-type': req.headers['content-type']
      },
      ip: req.ip,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        statusCode: (error as any).statusCode,
        code: (error as any).code,
        isOperational: (error as any).isOperational
      },
      timestamp: new Date().toISOString()
    };

    // Nivel de log basado en el tipo de error
    if (ErrorMiddleware.isClientError(error)) {
      ErrorMiddleware.logger.warn('Client error occurred', errorInfo);
    } else {
      ErrorMiddleware.logger.error('Server error occurred', errorInfo);
    }
  }

  /**
   * Construye la respuesta de error apropiada
   */
  private static buildErrorResponse(error: Error, req: Request): {
    statusCode: number;
    body: any;
  } {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const requestId = req.headers['x-request-id'] || 'unknown';

    // Error de aplicación personalizado
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        body: {
          success: false,
          error: error.message,
          code: error.code,
          requestId,
          ...(isDevelopment && { stack: error.stack })
        }
      };
    }

    // Error de Axios (peticiones HTTP)
    if (error.name === 'AxiosError' || (error as any).isAxiosError) {
      const axiosError = error as any;
      const statusCode = axiosError.response?.status || 502;
      const message = axiosError.response?.data?.message ||
                     axiosError.message ||
                     'External service error';

      return {
        statusCode: statusCode >= 400 && statusCode < 500 ? 400 : 502,
        body: {
          success: false,
          error: 'External service error',
          message,
          code: 'EXTERNAL_SERVICE_ERROR',
          requestId,
          ...(isDevelopment && {
            details: {
              url: axiosError.config?.url,
              method: axiosError.config?.method,
              status: axiosError.response?.status,
              response: axiosError.response?.data
            }
          })
        }
      };
    }

    // Error de validación de Joi
    if (error.name === 'ValidationError' && (error as any).isJoi) {
      const joiError = error as any;
      return {
        statusCode: 400,
        body: {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: joiError.details?.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          })),
          requestId
        }
      };
    }

    // Error de timeout
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return {
        statusCode: 408,
        body: {
          success: false,
          error: 'Request timeout',
          code: 'TIMEOUT_ERROR',
          requestId
        }
      };
    }

    // Error genérico no manejado
  // Tomar en cuenta error.status (usado por algunas libs) si statusCode no existe
  const statusCode = (error as any).statusCode || (error as any).status || 500;
    const isServerError = statusCode >= 500;

    return {
      statusCode,
      body: {
        success: false,
        error: isServerError ? 'Internal server error' : error.message,
        code: (error as any).code || 'INTERNAL_ERROR',
        requestId,
        ...(isDevelopment && isServerError && {
          details: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        })
      }
    };
  }

  /**
   * Determina si es un error del cliente (4xx)
   */
  private static isClientError(error: Error): boolean {
    const statusCode = (error as any).statusCode;
    return statusCode && statusCode >= 400 && statusCode < 500;
  }

  /**
   * Middleware para manejo de errores de CORS
   */
  static corsErrorHandler = (req: Request, res: Response, next: NextFunction): void => {
    res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Request-ID');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  };

  /**
   * Middleware para agregar headers de seguridad y request ID
   */
  static securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Agregar request ID si no existe
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = ErrorMiddleware.generateRequestId();
    }

    // Headers de seguridad
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
  };

  /**
   * Genera un ID único para el request
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Middleware para logging de requests
   */
  static requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'];

    ErrorMiddleware.logger.http('Request received', {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Interceptar el final de la respuesta para logear
    const originalSend = res.send;
    res.send = function(body) {
      const duration = Date.now() - startTime;

      ErrorMiddleware.logger.http('Request completed', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        responseSize: Buffer.byteLength(body || '')
      });

      return originalSend.call(this, body);
    };

    next();
  };

  /**
   * Obtiene estadísticas de errores (para monitoreo)
   */
  static getErrorStats(): object {
    return {
      // En una implementación real, esto vendría de métricas almacenadas
      totalErrors: 0,
      clientErrors: 0,
      serverErrors: 0,
      lastError: null,
      errorRate: 0,
      avgResponseTime: 0
    };
  }
}

export default ErrorMiddleware;