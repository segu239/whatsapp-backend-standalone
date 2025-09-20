import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createLogger } from '../utils/logger';
import { RetryUtil } from '../utils/retry.util';
import {
  CronhookSchedule,
  CronhookResponse,
  CronhookListResponse,
  ScheduleMessageRequest
} from '../interfaces/cronhooks.interface';

export class CronhooksService {
  private axiosInstance: AxiosInstance;
  private logger = createLogger('CronhooksService');
  private apiKey: string;
  private baseUrl: string;
  private webhookBaseUrl: string;
  private disabled: boolean = false;

  constructor() {
    this.baseUrl = process.env.CRONHOOKS_API_URL || 'https://api.cronhooks.io';
    this.apiKey = process.env.CRONHOOKS_API_TOKEN || '';
    this.webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';

    if (!this.apiKey) {
      this.logger.warn('CRONHOOKS_API_TOKEN is not configured - CronhooksService running in disabled mode');
      this.disabled = true;
      this.axiosInstance = axios.create({ baseURL: this.baseUrl });
      return;
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: parseInt(process.env.DEFAULT_TIMEOUT_MS || '30000'),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WhatsApp-Scheduler-Backend/1.0.0'
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor para logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          headers: { ...config.headers, Authorization: '[REDACTED]' }
        });
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor para logging y manejo de errores
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug(`Response from ${response.config.method?.toUpperCase()} ${response.config.url}`, {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        this.logger.apiError(
          error.config?.method?.toUpperCase() || 'UNKNOWN',
          error.config?.url || 'UNKNOWN',
          error
        );
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: any): Error {
    if (error.response) {
      const { status, data } = error.response;
      let message = `Cronhooks API error (${status})`;

      if (data?.message) {
        message += `: ${data.message}`;
      }

      if (data?.errors) {
        const validationErrors = Object.values(data.errors).flat();
        message += ` - Validation errors: ${validationErrors.join(', ')}`;
      }

      const formattedError = new Error(message);
      (formattedError as any).status = status;
      (formattedError as any).response = error.response;
      return formattedError;
    }

    if (error.code) {
      return new Error(`Network error: ${error.code} - ${error.message}`);
    }

    return new Error(error.message || 'Unknown Cronhooks API error');
  }

  private getWebhookUrl(): string {
    return `${this.webhookBaseUrl}/webhook/message-trigger`;
  }

  /**
   * Crea un schedule para mensaje único
   */
  async createOneTimeSchedule(messageData: ScheduleMessageRequest): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      const payload: CronhookSchedule = {
        title: `WhatsApp Message to ${messageData.contactName}`,
        description: `Automated message: ${messageData.message.substring(0, 50)}...`,
        url: this.getWebhookUrl(),
        timezone: messageData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        payload: {
          phoneNumber: messageData.phoneNumber,
          message: messageData.message,
          contactName: messageData.contactName
        },
        contentType: "application/json",
        isRecurring: false,
        runAt: messageData.scheduledDateTime,
        sendCronhookObject: true,
        sendFailureAlert: true,
        retryCount: "3",
        retryIntervalSeconds: "60"
      };

      this.logger.info('Creating one-time schedule', {
        contactName: messageData.contactName,
        phoneNumber: messageData.phoneNumber,
        scheduledDateTime: messageData.scheduledDateTime
      });

      const response = await this.axiosInstance.post<CronhookResponse>('/schedules', payload);

      this.logger.serviceOperation('createOneTimeSchedule', 'success', {
        scheduleId: response.data.id,
        contactName: messageData.contactName
      });

      return response.data;
    }, 'createOneTimeSchedule');
  }

  /**
   * Crea un schedule recurrente
   */
  async createRecurringSchedule(messageData: ScheduleMessageRequest): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      if (!messageData.cronExpression) {
        throw new Error('Cron expression is required for recurring schedules');
      }

      const payload: CronhookSchedule = {
        title: `Recurring WhatsApp Message to ${messageData.contactName}`,
        description: `Automated recurring message: ${messageData.message.substring(0, 50)}...`,
        url: this.getWebhookUrl(),
        timezone: messageData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        payload: {
          phoneNumber: messageData.phoneNumber,
          message: messageData.message,
          contactName: messageData.contactName
        },
        contentType: "application/json",
        isRecurring: true,
        cronExpression: messageData.cronExpression,
        startsAt: messageData.startsAt,
        endsAt: messageData.endsAt,
        sendCronhookObject: true,
        sendFailureAlert: true
      };

      this.logger.info('Creating recurring schedule', {
        contactName: messageData.contactName,
        phoneNumber: messageData.phoneNumber,
        cronExpression: messageData.cronExpression,
        startsAt: messageData.startsAt,
        endsAt: messageData.endsAt
      });

      const response = await this.axiosInstance.post<CronhookResponse>('/schedules', payload);

      this.logger.serviceOperation('createRecurringSchedule', 'success', {
        scheduleId: response.data.id,
        contactName: messageData.contactName
      });

      return response.data;
    }, 'createRecurringSchedule');
  }

  /**
   * Crea un schedule basado en el tipo (único o recurrente)
   */
  async createSchedule(messageData: ScheduleMessageRequest): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    if (messageData.isRecurring) {
      return this.createRecurringSchedule(messageData);
    } else {
      return this.createOneTimeSchedule(messageData);
    }
  }

  /**
   * Obtiene un schedule por ID
   */
  async getSchedule(scheduleId: string): Promise<CronhookSchedule> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Fetching schedule', { scheduleId });

      const response = await this.axiosInstance.get<CronhookSchedule>(`/schedules/${scheduleId}`);

      this.logger.serviceOperation('getSchedule', 'success', {
        scheduleId,
        status: response.data.status
      });

      return response.data;
    }, 'getSchedule');
  }

  /**
   * Lista todos los schedules con paginación
   */
  async listSchedules(skip: number = 0, limit: number = 50): Promise<CronhookListResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Listing schedules', { skip, limit });

      const response = await this.axiosInstance.get<CronhookListResponse>(`/schedules`, {
        params: { skip, limit }
      });

      this.logger.serviceOperation('listSchedules', 'success', {
        totalSchedules: response.data.pagination.total,
        returnedCount: response.data.data.length
      });

      return response.data;
    }, 'listSchedules');
  }

  /**
   * Actualiza un schedule
   */
  async updateSchedule(scheduleId: string, updateData: Partial<CronhookSchedule>): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Updating schedule', { scheduleId, updateData });

      const response = await this.axiosInstance.put<CronhookResponse>(`/schedules/${scheduleId}`, updateData);

      this.logger.serviceOperation('updateSchedule', 'success', {
        scheduleId,
        updatedFields: Object.keys(updateData)
      });

      return response.data;
    }, 'updateSchedule');
  }

  /**
   * Elimina un schedule
   */
  async deleteSchedule(scheduleId: string): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Deleting schedule', { scheduleId });

      const response = await this.axiosInstance.delete<CronhookResponse>(`/schedules/${scheduleId}`);

      this.logger.serviceOperation('deleteSchedule', 'success', { scheduleId });

      return response.data;
    }, 'deleteSchedule');
  }

  /**
   * Pausa un schedule
   */
  async pauseSchedule(scheduleId: string): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Pausing schedule', { scheduleId });

      const response = await this.axiosInstance.post<CronhookResponse>(`/schedules/${scheduleId}/pause`, {});

      this.logger.serviceOperation('pauseSchedule', 'success', { scheduleId });

      return response.data;
    }, 'pauseSchedule');
  }

  /**
   * Reanuda un schedule
   */
  async resumeSchedule(scheduleId: string): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Resuming schedule', { scheduleId });

      const response = await this.axiosInstance.post<CronhookResponse>(`/schedules/${scheduleId}/resume`, {});

      this.logger.serviceOperation('resumeSchedule', 'success', { scheduleId });

      return response.data;
    }, 'resumeSchedule');
  }

  /**
   * Ejecuta un schedule manualmente
   */
  async triggerSchedule(scheduleId: string): Promise<CronhookResponse> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Triggering schedule manually', { scheduleId });

      const response = await this.axiosInstance.post<CronhookResponse>(`/schedules/${scheduleId}/trigger`, {});

      this.logger.serviceOperation('triggerSchedule', 'success', { scheduleId });

      return response.data;
    }, 'triggerSchedule');
  }

  /**
   * Obtiene estadísticas de un schedule
   */
  async getScheduleStats(scheduleId: string): Promise<any> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Fetching schedule statistics', { scheduleId });

      const response = await this.axiosInstance.get(`/schedules/${scheduleId}/stats`);

      this.logger.serviceOperation('getScheduleStats', 'success', {
        scheduleId,
        stats: response.data
      });

      return response.data;
    }, 'getScheduleStats');
  }

  /**
   * Obtiene el historial de ejecuciones de un schedule
   */
  async getScheduleHistory(scheduleId: string, limit: number = 20): Promise<any> {
    if (this.disabled) {
      throw new Error('CronhooksService disabled (missing CRONHOOKS_API_TOKEN)');
    }
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Fetching schedule history', { scheduleId, limit });

      const response = await this.axiosInstance.get(`/schedules/${scheduleId}/history`, {
        params: { limit }
      });

      this.logger.serviceOperation('getScheduleHistory', 'success', {
        scheduleId,
        historyCount: response.data.length
      });

      return response.data;
    }, 'getScheduleHistory');
  }

  /**
   * Valida una expresión cron
   */
  async validateCronExpression(cronExpression: string): Promise<boolean> {
    if (this.disabled) {
      this.logger.warn('validateCronExpression called while service disabled');
      return false;
    }
    try {
      const response = await this.axiosInstance.post('/validate-cron', {
        expression: cronExpression
      });

      this.logger.info('Cron expression validation', {
        expression: cronExpression,
        isValid: response.data.valid
      });

      return response.data.valid;
    } catch (error) {
      this.logger.error('Failed to validate cron expression', {
        expression: cronExpression,
        error
      });
      return false;
    }
  }

  /**
   * Obtiene el próximo tiempo de ejecución para una expresión cron
   */
  async getNextRunTime(cronExpression: string, timezone?: string): Promise<string | null> {
    if (this.disabled) {
      this.logger.warn('getNextRunTime called while service disabled');
      return null;
    }
    try {
      const response = await this.axiosInstance.post('/cron-next-run', {
        expression: cronExpression,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      return response.data.nextRun;
    } catch (error) {
      this.logger.error('Failed to get next run time', {
        expression: cronExpression,
        timezone,
        error
      });
      return null;
    }
  }

  /**
   * Valida que el servicio esté configurado correctamente
   */
  async validateConfiguration(): Promise<boolean> {
    if (this.disabled) {
      this.logger.warn('Cronhooks service disabled - skipping configuration validation');
      return false; // indica no disponible
    }
    try {
      const response = await this.axiosInstance.get('/account');
      this.logger.info('Cronhooks service configuration is valid', {
        account: response.data
      });
      return true;
    } catch (error) {
      this.logger.error('Cronhooks service configuration is invalid', error);
      return false;
    }
  }

  /**
   * Obtiene información de la cuenta
   */
  async getAccountInfo(): Promise<any> {
    return RetryUtil.executeCronhooksOperation(async () => {
      this.logger.info('Fetching account information');

      const response = await this.axiosInstance.get('/account');

      this.logger.serviceOperation('getAccountInfo', 'success', {
        account: response.data
      });

      return response.data;
    }, 'getAccountInfo');
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats(): object {
    return {
      baseUrl: this.baseUrl,
      webhookUrl: this.getWebhookUrl(),
      hasApiKey: !!this.apiKey,
      configuredTimeout: this.axiosInstance.defaults.timeout,
      disabled: this.disabled
    };
  }

  /**
   * Obtiene todas las programaciones activas
   */
  async getActiveSchedules(): Promise<CronhookSchedule[]> {
    const response = await this.listSchedules(0, 1000); // Obtener un gran número
    return response.data.filter(schedule => schedule.status === 'active');
  }

  /**
   * Obtiene estadísticas generales de schedules
   */
  async getGeneralStats(): Promise<any> {
    try {
      const allSchedules = await this.listSchedules(0, 1000);
      const schedules = allSchedules.data;

      const stats = {
        total: schedules.length,
        active: schedules.filter(s => s.status === 'active').length,
        paused: schedules.filter(s => s.status === 'paused').length,
        completed: schedules.filter(s => s.status === 'completed').length,
        recurring: schedules.filter(s => s.isRecurring).length,
        oneTime: schedules.filter(s => !s.isRecurring).length
      };

      this.logger.info('Generated schedule statistics', stats);
      return stats;
    } catch (error) {
      this.logger.error('Failed to generate schedule statistics', error);
      throw error;
    }
  }
}

export default CronhooksService;