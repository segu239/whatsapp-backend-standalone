import { createLogger } from '../utils/logger';
import axios from 'axios';

export interface NotificationConfig {
  email?: {
    enabled: boolean;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    fromEmail?: string;
    toEmail?: string;
  };
  webhook?: {
    enabled: boolean;
    url?: string;
    secret?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

export interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: any;
  timestamp?: Date;
  source?: string;
}

export class NotificationService {
  private logger = createLogger('NotificationService');
  private config: NotificationConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): NotificationConfig {
    return {
      email: {
        enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER,
        smtpPassword: process.env.SMTP_PASSWORD,
        fromEmail: process.env.FROM_EMAIL,
        toEmail: process.env.TO_EMAIL
      },
      webhook: {
        enabled: process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true',
        url: process.env.NOTIFICATION_WEBHOOK_URL,
        secret: process.env.NOTIFICATION_WEBHOOK_SECRET
      },
      slack: {
        enabled: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
        webhookUrl: process.env.SLACK_WEBHOOK_URL
      }
    };
  }

  /**
   * Envía una notificación de éxito
   */
  async notifySuccess(title: string, message: string, details?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'success',
      title,
      message,
      details,
      timestamp: new Date(),
      source: 'WhatsApp Scheduler Backend'
    };

    await this.sendNotification(notification);
  }

  /**
   * Envía una notificación de error
   */
  async notifyError(title: string, message: string, error?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'error',
      title,
      message,
      details: {
        error: error?.message || error,
        stack: error?.stack,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      source: 'WhatsApp Scheduler Backend'
    };

    await this.sendNotification(notification);
  }

  /**
   * Envía una notificación de advertencia
   */
  async notifyWarning(title: string, message: string, details?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'warning',
      title,
      message,
      details,
      timestamp: new Date(),
      source: 'WhatsApp Scheduler Backend'
    };

    await this.sendNotification(notification);
  }

  /**
   * Envía una notificación informativa
   */
  async notifyInfo(title: string, message: string, details?: any): Promise<void> {
    const notification: NotificationData = {
      type: 'info',
      title,
      message,
      details,
      timestamp: new Date(),
      source: 'WhatsApp Scheduler Backend'
    };

    await this.sendNotification(notification);
  }

  /**
   * Notifica sobre fallos en el envío de mensajes
   */
  async notifyMessageFailure(phoneNumber: string, error: any, context?: any): Promise<void> {
    await this.notifyError(
      'Message Delivery Failed',
      `Failed to send message to ${phoneNumber}`,
      {
        phoneNumber,
        error: error?.message || error,
        context,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notifica sobre fallos en schedules
   */
  async notifyScheduleFailure(scheduleId: string, error: any, context?: any): Promise<void> {
    await this.notifyError(
      'Schedule Execution Failed',
      `Failed to execute schedule ${scheduleId}`,
      {
        scheduleId,
        error: error?.message || error,
        context,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notifica sobre fallos en webhooks
   */
  async notifyWebhookFailure(webhookUrl: string, error: any, payload?: any): Promise<void> {
    await this.notifyError(
      'Webhook Processing Failed',
      `Failed to process webhook from ${webhookUrl}`,
      {
        webhookUrl,
        error: error?.message || error,
        payload,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Notifica sobre el éxito en el envío de mensajes
   */
  async notifyMessageSuccess(phoneNumber: string, messageId?: string, context?: any): Promise<void> {
    await this.notifySuccess(
      'Message Sent Successfully',
      `Message delivered to ${phoneNumber}`,
      {
        phoneNumber,
        messageId,
        context,
        timestamp: new Date().toISOString()
      }
    );
  }

  /**
   * Envía la notificación a través de todos los canales configurados
   */
  private async sendNotification(notification: NotificationData): Promise<void> {
    this.logger.info('Sending notification', {
      type: notification.type,
      title: notification.title,
      channels: this.getEnabledChannels()
    });

    const promises: Promise<void>[] = [];

    // Enviar por Slack si está habilitado
    if (this.config.slack?.enabled && this.config.slack.webhookUrl) {
      promises.push(this.sendSlackNotification(notification));
    }

    // Enviar por webhook si está habilitado
    if (this.config.webhook?.enabled && this.config.webhook.url) {
      promises.push(this.sendWebhookNotification(notification));
    }

    // Enviar por email si está habilitado (implementación futura)
    if (this.config.email?.enabled) {
      promises.push(this.sendEmailNotification(notification));
    }

    try {
      await Promise.allSettled(promises);
      this.logger.debug('Notification sent successfully', {
        type: notification.type,
        channelCount: promises.length
      });
    } catch (error) {
      this.logger.error('Failed to send notification', {
        notification,
        error
      });
    }
  }

  /**
   * Envía notificación por Slack
   */
  private async sendSlackNotification(notification: NotificationData): Promise<void> {
    try {
      const color = this.getSlackColor(notification.type);
      const slackPayload = {
        text: notification.title,
        attachments: [
          {
            color,
            title: notification.title,
            text: notification.message,
            fields: [
              {
                title: 'Type',
                value: notification.type.toUpperCase(),
                short: true
              },
              {
                title: 'Source',
                value: notification.source || 'Backend',
                short: true
              },
              {
                title: 'Timestamp',
                value: notification.timestamp?.toISOString() || new Date().toISOString(),
                short: true
              }
            ],
            footer: 'WhatsApp Scheduler',
            ts: Math.floor((notification.timestamp?.getTime() || Date.now()) / 1000)
          }
        ]
      };

      if (notification.details) {
        slackPayload.attachments[0].fields.push({
          title: 'Details',
          value: `\`\`\`${JSON.stringify(notification.details, null, 2)}\`\`\``,
          short: false
        });
      }

      await axios.post(this.config.slack!.webhookUrl!, slackPayload, {
        timeout: 10000
      });

      this.logger.debug('Slack notification sent successfully');
    } catch (error) {
      this.logger.error('Failed to send Slack notification', error);
    }
  }

  /**
   * Envía notificación por webhook personalizado
   */
  private async sendWebhookNotification(notification: NotificationData): Promise<void> {
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Scheduler-Backend/1.0.0'
      };

      if (this.config.webhook?.secret) {
        headers['X-Webhook-Secret'] = this.config.webhook.secret;
      }

      await axios.post(this.config.webhook!.url!, notification, {
        headers,
        timeout: 10000
      });

      this.logger.debug('Webhook notification sent successfully');
    } catch (error) {
      this.logger.error('Failed to send webhook notification', error);
    }
  }

  /**
   * Envía notificación por email (implementación básica)
   */
  private async sendEmailNotification(notification: NotificationData): Promise<void> {
    try {
      // Implementación básica - en producción usar un servicio como SendGrid, AWS SES, etc.
      this.logger.info('Email notification would be sent here', {
        to: this.config.email?.toEmail,
        subject: notification.title,
        body: notification.message
      });

      // Por ahora solo logeamos, pero aquí iría la implementación real del email
      // Por ejemplo, usando nodemailer:
      /*
      const transporter = nodemailer.createTransporter({
        host: this.config.email.smtpHost,
        port: this.config.email.smtpPort,
        secure: false,
        auth: {
          user: this.config.email.smtpUser,
          pass: this.config.email.smtpPassword
        }
      });

      await transporter.sendMail({
        from: this.config.email.fromEmail,
        to: this.config.email.toEmail,
        subject: notification.title,
        html: this.generateEmailHTML(notification)
      });
      */

    } catch (error) {
      this.logger.error('Failed to send email notification', error);
    }
  }

  /**
   * Obtiene el color para Slack basado en el tipo de notificación
   */
  private getSlackColor(type: string): string {
    switch (type) {
      case 'success':
        return 'good';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return '#36a64f';
    }
  }

  /**
   * Obtiene los canales de notificación habilitados
   */
  private getEnabledChannels(): string[] {
    const channels: string[] = [];

    if (this.config.slack?.enabled) channels.push('slack');
    if (this.config.webhook?.enabled) channels.push('webhook');
    if (this.config.email?.enabled) channels.push('email');

    return channels;
  }

  /**
   * Actualiza la configuración de notificaciones
   */
  updateConfiguration(newConfig: Partial<NotificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Notification configuration updated', {
      enabledChannels: this.getEnabledChannels()
    });
  }

  /**
   * Obtiene la configuración actual (sin datos sensibles)
   */
  getConfiguration(): Partial<NotificationConfig> {
    return {
      email: {
        enabled: this.config.email?.enabled,
        smtpHost: this.config.email?.smtpHost,
        smtpPort: this.config.email?.smtpPort,
        fromEmail: this.config.email?.fromEmail,
        toEmail: this.config.email?.toEmail
      },
      webhook: {
        enabled: this.config.webhook?.enabled,
        url: this.config.webhook?.url
      },
      slack: {
        enabled: this.config.slack?.enabled,
        webhookUrl: this.config.slack?.webhookUrl ? '[CONFIGURED]' : undefined
      }
    };
  }

  /**
   * Prueba los canales de notificación configurados
   */
  async testNotifications(): Promise<{ [channel: string]: boolean }> {
    const results: { [channel: string]: boolean } = {};

    // Probar Slack
    if (this.config.slack?.enabled) {
      try {
        await this.sendSlackNotification({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification from WhatsApp Scheduler Backend',
          timestamp: new Date(),
          source: 'Test'
        });
        results.slack = true;
      } catch (error) {
        results.slack = false;
        this.logger.error('Slack test notification failed', error);
      }
    }

    // Probar webhook
    if (this.config.webhook?.enabled) {
      try {
        await this.sendWebhookNotification({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification from WhatsApp Scheduler Backend',
          timestamp: new Date(),
          source: 'Test'
        });
        results.webhook = true;
      } catch (error) {
        results.webhook = false;
        this.logger.error('Webhook test notification failed', error);
      }
    }

    // Probar email
    if (this.config.email?.enabled) {
      try {
        await this.sendEmailNotification({
          type: 'info',
          title: 'Test Notification',
          message: 'This is a test notification from WhatsApp Scheduler Backend',
          timestamp: new Date(),
          source: 'Test'
        });
        results.email = true;
      } catch (error) {
        results.email = false;
        this.logger.error('Email test notification failed', error);
      }
    }

    this.logger.info('Notification tests completed', results);
    return results;
  }
}

export default NotificationService;