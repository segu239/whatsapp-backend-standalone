import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import WasenderService from '../services/wasender.service';
import NotificationService from '../services/notification.service';
import { CronhookWebhookPayload } from '../interfaces/cronhooks.interface';

export class WebhooksController {
  private logger = createLogger('WebhooksController');
  private wasenderService: WasenderService;
  private notificationService: NotificationService;

  constructor() {
    this.wasenderService = new WasenderService();
    this.notificationService = new NotificationService();
  }

  /**
   * Maneja webhooks de Cronhooks para envío de mensajes
   * POST /webhook/message-trigger
   */
  handleMessageTrigger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const webhookPayload: CronhookWebhookPayload = req.body;
      const requestId = req.headers['x-request-id'] || 'unknown';

      this.logger.webhookReceived('cronhooks-message-trigger', {
        cronhookId: webhookPayload._cronhook_id,
        phoneNumber: webhookPayload.phoneNumber,
        contactName: webhookPayload.contactName,
        requestId
      });

      // Validar webhook secret si está configurado
      const expectedSecret = process.env.WEBHOOK_SECRET;
      if (expectedSecret) {
        const receivedSecret = req.headers['x-webhook-secret'];
        if (receivedSecret !== expectedSecret) {
          this.logger.error('Webhook secret validation failed', {
            expectedPresent: !!expectedSecret,
            receivedPresent: !!receivedSecret,
            cronhookId: webhookPayload._cronhook_id
          });

          res.status(401).json({
            success: false,
            error: 'Invalid webhook secret'
          });
          return;
        }
      }

      // Validaciones del payload
      if (!webhookPayload.phoneNumber) {
        this.logger.error('Invalid webhook payload: missing phone number', {
          payload: webhookPayload
        });

        res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
        return;
      }

      if (!webhookPayload.message) {
        this.logger.error('Invalid webhook payload: missing message', {
          payload: webhookPayload
        });

        res.status(400).json({
          success: false,
          error: 'Message is required'
        });
        return;
      }

      // Enviar mensaje a través del servicio Wasender
      const result = await this.wasenderService.sendTextMessage(
        webhookPayload.phoneNumber,
        webhookPayload.message
      );

      if (result.success) {
        this.logger.info('Webhook message sent successfully', {
          cronhookId: webhookPayload._cronhook_id,
          phoneNumber: webhookPayload.phoneNumber,
          contactName: webhookPayload.contactName,
          messageId: result.data?.id,
          status: result.data?.status
        });

        // Notificar éxito
        await this.notificationService.notifyMessageSuccess(
          webhookPayload.phoneNumber,
          result.data?.id,
          {
            cronhookId: webhookPayload._cronhook_id,
            contactName: webhookPayload.contactName,
            triggerType: 'webhook'
          }
        );

        res.status(200).json({
          success: true,
          data: {
            cronhookId: webhookPayload._cronhook_id,
            messageId: result.data?.id,
            status: result.data?.status,
            timestamp: new Date().toISOString()
          },
          message: 'Message sent successfully via webhook'
        });

      } else {
        this.logger.error('Webhook message sending failed', {
          cronhookId: webhookPayload._cronhook_id,
          phoneNumber: webhookPayload.phoneNumber,
          result
        });

        // Notificar fallo
        await this.notificationService.notifyMessageFailure(
          webhookPayload.phoneNumber,
          new Error(result.error || 'Unknown error'),
          {
            cronhookId: webhookPayload._cronhook_id,
            contactName: webhookPayload.contactName,
            triggerType: 'webhook'
          }
        );

        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send message'
        });
      }

    } catch (error) {
      this.logger.error('Webhook processing failed', {
        error: error.message,
        payload: req.body,
        headers: req.headers
      });

      // Notificar fallo
      await this.notificationService.notifyWebhookFailure(
        req.url,
        error,
        req.body
      );

      next(error);
    }
  };

  /**
   * Webhook de test para verificar conectividad
   * POST /webhook/test
   */
  handleTestWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const testPayload = req.body;

      this.logger.webhookReceived('test-webhook', testPayload);

      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 100));

      this.logger.info('Test webhook processed successfully', {
        payload: testPayload,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: {
          received: testPayload,
          processedAt: new Date().toISOString(),
          message: 'Test webhook processed successfully'
        },
        message: 'Test webhook received and processed'
      });

    } catch (error) {
      this.logger.error('Test webhook processing failed', {
        error: error.message,
        payload: req.body
      });
      next(error);
    }
  };

  /**
   * Webhook para notificaciones de fallo de Cronhooks
   * POST /webhook/failure-notification
   */
  handleFailureNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const failurePayload = req.body;

      this.logger.webhookReceived('cronhooks-failure', failurePayload);

      // Procesar notificación de fallo
      const scheduleId = failurePayload.scheduleId || failurePayload._cronhook_id;
      const errorMessage = failurePayload.error || failurePayload.message || 'Unknown failure';

      this.logger.error('Received failure notification from Cronhooks', {
        scheduleId,
        error: errorMessage,
        payload: failurePayload
      });

      // Enviar notificación interna
      await this.notificationService.notifyScheduleFailure(
        scheduleId,
        new Error(errorMessage),
        {
          source: 'cronhooks-webhook',
          payload: failurePayload
        }
      );

      res.status(200).json({
        success: true,
        data: {
          scheduleId,
          processedAt: new Date().toISOString()
        },
        message: 'Failure notification processed'
      });

    } catch (error) {
      this.logger.error('Failure notification processing failed', {
        error: error.message,
        payload: req.body
      });
      next(error);
    }
  };

  /**
   * Webhook genérico para otros tipos de notificaciones
   * POST /webhook/notification
   */
  handleGenericNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const notificationPayload = req.body;

      this.logger.webhookReceived('generic-notification', notificationPayload);

      // Determinar el tipo de notificación
      const notificationType = notificationPayload.type || 'info';
      const title = notificationPayload.title || 'Generic Notification';
      const message = notificationPayload.message || 'No message provided';

      // Enviar notificación según el tipo
      switch (notificationType.toLowerCase()) {
        case 'error':
          await this.notificationService.notifyError(title, message, notificationPayload.details);
          break;
        case 'warning':
          await this.notificationService.notifyWarning(title, message, notificationPayload.details);
          break;
        case 'success':
          await this.notificationService.notifySuccess(title, message, notificationPayload.details);
          break;
        case 'info':
        default:
          await this.notificationService.notifyInfo(title, message, notificationPayload.details);
          break;
      }

      this.logger.info('Generic notification processed', {
        type: notificationType,
        title,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        data: {
          type: notificationType,
          processedAt: new Date().toISOString()
        },
        message: 'Notification processed successfully'
      });

    } catch (error) {
      this.logger.error('Generic notification processing failed', {
        error: error.message,
        payload: req.body
      });
      next(error);
    }
  };

  /**
   * Health check para webhooks
   * GET /webhook/health
   */
  webhookHealthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const healthData = {
        service: 'webhooks',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
          messageTrigger: '/webhook/message-trigger',
          test: '/webhook/test',
          failureNotification: '/webhook/failure-notification',
          genericNotification: '/webhook/notification'
        },
        configuration: {
          hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
          baseUrl: process.env.WEBHOOK_BASE_URL || 'not-configured'
        }
      };

      this.logger.info('Webhook health check completed', healthData);

      res.status(200).json({
        success: true,
        data: healthData,
        message: 'Webhook service is healthy'
      });

    } catch (error) {
      this.logger.error('Webhook health check failed', {
        error: error.message
      });

      res.status(503).json({
        success: false,
        data: {
          service: 'webhooks',
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        },
        message: 'Webhook service health check failed'
      });
    }
  };

  /**
   * Obtiene estadísticas de webhooks procesados
   * GET /webhook/stats
   */
  getWebhookStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // En una implementación real, esto vendría de una base de datos o cache
      const stats = {
        totalWebhooksProcessed: 0, // Placeholder
        successfulWebhooks: 0,     // Placeholder
        failedWebhooks: 0,         // Placeholder
        lastProcessed: null,       // Placeholder
        endpoints: {
          messageTrigger: { count: 0, lastUsed: null },
          test: { count: 0, lastUsed: null },
          failureNotification: { count: 0, lastUsed: null },
          genericNotification: { count: 0, lastUsed: null }
        },
        generatedAt: new Date().toISOString()
      };

      this.logger.info('Webhook statistics generated', stats);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Webhook statistics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to generate webhook statistics', {
        error: error.message
      });
      next(error);
    }
  };
}

export default WebhooksController;