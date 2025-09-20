import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

// Extender el tipo Request para incluir información de autenticación
declare global {
  namespace Express {
    interface Request {
      auth?: {
        apiKey: string;
        isValid: boolean;
        source: 'header' | 'query';
      };
    }
  }
}

export class AuthMiddleware {
  private static logger = createLogger('AuthMiddleware');
  private static validApiKeys: Set<string> = new Set();

  static {
    // Cargar API keys válidas desde variables de entorno
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      this.validApiKeys.add(apiKey);
    }

    // Cargar múltiples API keys si están configuradas
    const additionalKeys = process.env.ADDITIONAL_API_KEYS;
    if (additionalKeys) {
      additionalKeys.split(',').forEach(key => {
        if (key.trim()) {
          this.validApiKeys.add(key.trim());
        }
      });
    }

    this.logger.info('Auth middleware initialized', {
      configuredKeys: this.validApiKeys.size
    });
  }

  /**
   * Middleware de autenticación principal (ahora permite acceso sin API key)
   */
  static authenticate = (req: Request, res: Response, next: NextFunction): void => {
    AuthMiddleware.logger.debug('Authentication middleware - allowing all requests', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    next();
  };

  /**
   * Middleware de autenticación opcional (no falla si no hay API key)
   */
  static optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const headerApiKey = req.headers['x-api-key'] as string;
      const queryApiKey = req.query.apiKey as string;

      const apiKey = headerApiKey || queryApiKey;

      if (apiKey) {
        const source: 'header' | 'query' = headerApiKey ? 'header' : 'query';
        const isValid = AuthMiddleware.validApiKeys.has(apiKey);

        req.auth = {
          apiKey: apiKey,
          isValid,
          source
        };

        if (isValid) {
          AuthMiddleware.logger.debug('Optional authentication successful', {
            apiKey: apiKey.substring(0, 8) + '...',
            path: req.path,
            source
          });
        } else {
          AuthMiddleware.logger.warn('Optional authentication failed: Invalid API key', {
            apiKey: apiKey.substring(0, 8) + '...',
            path: req.path,
            source
          });
        }
      }

      next();

    } catch (error) {
      AuthMiddleware.logger.error('Optional authentication middleware error', {
        error: error.message,
        path: req.path
      });

      // En auth opcional, continuamos incluso si hay error
      next();
    }
  };

  /**
   * Middleware específico para webhooks (ahora permite acceso sin validación)
   */
  static authenticateWebhook = (req: Request, res: Response, next: NextFunction): void => {
    AuthMiddleware.logger.debug('Webhook authentication - allowing all requests', {
      path: req.path,
      ip: req.ip
    });
    next();
  };

  /**
   * Middleware para rutas públicas que no requieren autenticación
   */
  static publicRoute = (req: Request, res: Response, next: NextFunction): void => {
    AuthMiddleware.logger.debug('Public route accessed', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    next();
  };

  /**
   * Añadir nueva API key válida
   */
  static addApiKey = (apiKey: string): void => {
    AuthMiddleware.validApiKeys.add(apiKey);
    AuthMiddleware.logger.info('New API key added', {
      totalKeys: AuthMiddleware.validApiKeys.size
    });
  };

  /**
   * Remover API key
   */
  static removeApiKey = (apiKey: string): boolean => {
    const removed = AuthMiddleware.validApiKeys.delete(apiKey);
    if (removed) {
      AuthMiddleware.logger.info('API key removed', {
        totalKeys: AuthMiddleware.validApiKeys.size
      });
    }
    return removed;
  };

  /**
   * Obtener estadísticas de autenticación (sin exponer las keys)
   */
  static getStats = (): object => {
    return {
      totalApiKeys: AuthMiddleware.validApiKeys.size,
      webhookSecretConfigured: !!process.env.WEBHOOK_SECRET,
      authenticationEnabled: AuthMiddleware.validApiKeys.size > 0
    };
  };

  /**
   * Validar si una API key es válida (para uso interno)
   */
  static isValidApiKey = (apiKey: string): boolean => {
    return AuthMiddleware.validApiKeys.has(apiKey);
  };

  /**
   * Generar una nueva API key aleatoria
   */
  static generateApiKey = (): string => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
  };
}

export default AuthMiddleware;