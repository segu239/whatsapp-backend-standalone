import { Router } from 'express';
import { WebhooksController } from '../controllers/webhooks.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';

const router = Router();

// Instanciar controller
const webhooksController = new WebhooksController();

// ============================================================================
// WEBHOOK ROUTES (Públicas con autenticación por webhook secret)
// ============================================================================

/**
 * @route   POST /webhook/message-trigger
 * @desc    Webhook principal para triggers de mensajes desde Cronhooks
 * @access  Public (autenticación por webhook secret)
 * @note    Esta es la URL que se configura en Cronhooks
 */
router.post('/message-trigger',
  AuthMiddleware.authenticateWebhook,
  ValidationMiddleware.validateBody(ValidationSchemas.cronhookWebhook),
  ErrorMiddleware.asyncHandler(webhooksController.handleMessageTrigger)
);

/**
 * @route   POST /webhook/test
 * @desc    Webhook de test para verificar conectividad
 * @access  Public (sin autenticación para testing)
 */
router.post('/test',
  ErrorMiddleware.asyncHandler(webhooksController.handleTestWebhook)
);

/**
 * @route   POST /webhook/failure-notification
 * @desc    Webhook para recibir notificaciones de fallo desde Cronhooks
 * @access  Public (autenticación por webhook secret)
 */
router.post('/failure-notification',
  AuthMiddleware.authenticateWebhook,
  ErrorMiddleware.asyncHandler(webhooksController.handleFailureNotification)
);

/**
 * @route   POST /webhook/notification
 * @desc    Webhook genérico para notificaciones
 * @access  Public (autenticación por webhook secret)
 */
router.post('/notification',
  AuthMiddleware.authenticateWebhook,
  ValidationMiddleware.validateBody(ValidationSchemas.genericNotification),
  ErrorMiddleware.asyncHandler(webhooksController.handleGenericNotification)
);

/**
 * @route   GET /webhook/health
 * @desc    Health check para el servicio de webhooks
 * @access  Public
 */
router.get('/health',
  ErrorMiddleware.asyncHandler(webhooksController.webhookHealthCheck)
);

/**
 * @route   GET /webhook/stats
 * @desc    Estadísticas de webhooks procesados (requiere API key)
 * @access  Private (requiere API key)
 */
router.get('/stats',
  AuthMiddleware.authenticate,
  ErrorMiddleware.asyncHandler(webhooksController.getWebhookStats)
);

// ============================================================================
// WEBHOOK INFO ROUTES (Públicas para documentación)
// ============================================================================

/**
 * @route   GET /webhook/info
 * @desc    Información sobre los webhooks disponibles
 * @access  Public
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'WhatsApp Scheduler Webhooks',
      version: '1.0.0',
      availableEndpoints: {
        messageTrigger: {
          path: '/webhook/message-trigger',
          method: 'POST',
          description: 'Main webhook for message triggers from Cronhooks',
          authentication: 'webhook-secret',
          requiredHeaders: ['X-Webhook-Secret'],
          expectedPayload: {
            _cronhook_id: 'string',
            phoneNumber: 'string',
            message: 'string',
            contactName: 'string'
          }
        },
        test: {
          path: '/webhook/test',
          method: 'POST',
          description: 'Test webhook for connectivity verification',
          authentication: 'none',
          expectedPayload: 'any'
        },
        failureNotification: {
          path: '/webhook/failure-notification',
          method: 'POST',
          description: 'Webhook for failure notifications from Cronhooks',
          authentication: 'webhook-secret',
          requiredHeaders: ['X-Webhook-Secret']
        },
        genericNotification: {
          path: '/webhook/notification',
          method: 'POST',
          description: 'Generic webhook for notifications',
          authentication: 'webhook-secret',
          requiredHeaders: ['X-Webhook-Secret'],
          expectedPayload: {
            type: 'success|error|warning|info',
            title: 'string',
            message: 'string',
            details: 'optional'
          }
        }
      },
      configuration: {
        baseUrl: process.env.WEBHOOK_BASE_URL || 'https://your-backend.railway.app',
        authenticationMethod: 'webhook-secret',
        hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
        supportedFormats: ['application/json'],
        maxPayloadSize: '10MB',
        timeout: '30s'
      },
      usage: {
        cronhooksIntegration: {
          webhookUrl: `${process.env.WEBHOOK_BASE_URL || 'https://your-backend.railway.app'}/webhook/message-trigger`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': process.env.WEBHOOK_SECRET ? '[CONFIGURED]' : '[NOT_CONFIGURED]'
          },
          description: 'Configure this URL in Cronhooks for automated message triggers'
        }
      }
    },
    message: 'Webhook service information'
  });
});

/**
 * @route   GET /webhook
 * @desc    Webhook service status y redirección a info
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'WhatsApp Scheduler Webhooks',
      status: 'operational',
      timestamp: new Date().toISOString(),
      endpoints: {
        info: '/webhook/info',
        health: '/webhook/health',
        test: '/webhook/test',
        main: '/webhook/message-trigger'
      }
    },
    message: 'Webhook service is operational'
  });
});

export default router;