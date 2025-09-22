import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger } from '../utils/logger';

export class ValidationMiddleware {
  private static logger = createLogger('ValidationMiddleware');

  /**
   * Crea un middleware de validación para el body del request
   */
  static validateBody = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        ValidationMiddleware.logger.warn('Request body validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        });
        return;
      }

      // Reemplazar req.body con el valor validado y sanitizado
      req.body = value;
      next();
    };
  };

  /**
   * Crea un middleware de validación para query parameters
   */
  static validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        ValidationMiddleware.logger.warn('Query parameters validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        res.status(400).json({
          success: false,
          error: 'Query validation failed',
          code: 'QUERY_VALIDATION_ERROR',
          details: validationErrors
        });
        return;
      }

      // Reemplazar req.query con el valor validado
      req.query = value;
      next();
    };
  };

  /**
   * Crea un middleware de validación para path parameters
   */
  static validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        ValidationMiddleware.logger.warn('Path parameters validation failed', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        res.status(400).json({
          success: false,
          error: 'Path parameters validation failed',
          code: 'PARAMS_VALIDATION_ERROR',
          details: validationErrors
        });
        return;
      }

      req.params = value;
      next();
    };
  };
}

// Esquemas de validación predefinidos
export const ValidationSchemas = {
  // Schema para envío de mensajes
  sendMessage: Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be a valid international format',
        'any.required': 'Phone number is required'
      }),
    messageType: Joi.string()
      .valid('text', 'image', 'document', 'audio', 'video')
      .required()
      .messages({
        'any.only': 'Message type must be one of: text, image, document, audio, video',
        'any.required': 'Message type is required'
      }),
    message: Joi.string()
      .max(4096)
      .when('messageType', {
        is: 'text',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
      .messages({
        'string.max': 'Message cannot exceed 4096 characters',
        'any.required': 'Message is required for text messages'
      }),
    imageUrl: Joi.string()
      .uri()
      .when('messageType', {
        is: 'image',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
    documentUrl: Joi.string()
      .uri()
      .when('messageType', {
        is: 'document',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
    audioUrl: Joi.string()
      .uri()
      .when('messageType', {
        is: 'audio',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
    videoUrl: Joi.string()
      .uri()
      .when('messageType', {
        is: 'video',
        then: Joi.required(),
        otherwise: Joi.forbidden()
      }),
    caption: Joi.string()
      .max(1024)
      .optional()
      .messages({
        'string.max': 'Caption cannot exceed 1024 characters'
      }),
    filename: Joi.string()
      .max(255)
      .optional()
      .messages({
        'string.max': 'Filename cannot exceed 255 characters'
      }),
    // Alias oficial (fileName) aceptado además de filename legacy; se permite cualquiera de los dos
    fileName: Joi.string()
      .max(255)
      .optional()
      .messages({
        'string.max': 'fileName cannot exceed 255 characters'
      })
  }),

  // Schema para programación de mensajes
  scheduleMessage: Joi.object({
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be a valid international format'
      }),
    message: Joi.string()
      .max(4096)
      .required()
      .messages({
        'string.max': 'Message cannot exceed 4096 characters'
      }),
    contactName: Joi.string()
      .max(100)
      .required()
      .messages({
        'string.max': 'Contact name cannot exceed 100 characters'
      }),
    isRecurring: Joi.boolean()
      .default(false),
    scheduledDateTime: Joi.string()
      .isoDate()
      .when('isRecurring', {
        is: false,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
      .messages({
        'string.isoDate': 'Scheduled date time must be a valid ISO date',
        'any.required': 'Scheduled date time is required for one-time messages'
      }),
    cronExpression: Joi.string()
      .pattern(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/)
      .when('isRecurring', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.forbidden()
      })
      .messages({
        'string.pattern.base': 'Cron expression must be valid (minute hour day month dayOfWeek)',
        'any.required': 'Cron expression is required for recurring messages'
      }),
    startsAt: Joi.string()
      .isoDate()
      .when('isRecurring', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      })
      .messages({
        'string.isoDate': 'Start date must be a valid ISO date'
      }),
    endsAt: Joi.string()
      .isoDate()
      .when('isRecurring', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      })
      .messages({
        'string.isoDate': 'End date must be a valid ISO date'
      }),
    timezone: Joi.string()
      .optional()
      .default('UTC')
  }),

  // Schema para actualización de schedules
  updateSchedule: Joi.object({
    title: Joi.string().max(200).optional(),
    description: Joi.string().max(500).optional(),
    cronExpression: Joi.string()
      .pattern(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/)
      .optional(),
    startsAt: Joi.string().isoDate().optional(),
    endsAt: Joi.string().isoDate().optional(),
    timezone: Joi.string().optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Schema para crear sesión de WhatsApp
  createSession: Joi.object({
    name: Joi.string()
      .max(50)
      .required()
      .messages({
        'string.max': 'Session name cannot exceed 50 characters'
      })
  }),

  // Schema para actualizar sesión
  updateSession: Joi.object({
    name: Joi.string().max(50).optional()
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update'
  }),

  // Schema para parámetros de paginación
  pagination: Joi.object({
    skip: Joi.number()
      .integer()
      .min(0)
      .default(0)
      .messages({
        'number.integer': 'Skip must be an integer',
        'number.min': 'Skip must be non-negative'
      }),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(50)
      .messages({
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      })
  }),

  // Schema para IDs en parámetros
  idParam: Joi.object({
    id: Joi.string()
      .required()
      .messages({
        'any.required': 'ID parameter is required'
      })
  }),

  // Schema para webhook de Cronhooks
  cronhookWebhook: Joi.object({
    _cronhook_id: Joi.string().required(),
    _random: Joi.string().optional(),
    _uuid: Joi.string().optional(),
    _timestamp: Joi.string().optional(),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required(),
    message: Joi.string()
      .max(4096)
      .required(),
    contactName: Joi.string()
      .max(100)
      .required()
  }),

  // Schema para notificaciones genéricas
  genericNotification: Joi.object({
    type: Joi.string()
      .valid('success', 'error', 'warning', 'info')
      .default('info'),
    title: Joi.string()
      .max(200)
      .required(),
    message: Joi.string()
      .max(1000)
      .required(),
    details: Joi.any().optional()
  })
};

export default ValidationMiddleware;