import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createLogger } from '../utils/logger';
import { RetryUtil } from '../utils/retry.util';
import { ServiceUnavailableError, AppError, UnauthorizedError, ForbiddenError } from '../middleware/error.middleware';
import {
  WasenderMessage,
  WasenderResponse,
  WasenderSession,
  WasenderAccountInfo,
  SendMessageRequest
} from '../interfaces/wasender.interface';

export class WasenderService {
  private axiosInstance: AxiosInstance;
  private logger = createLogger('WasenderService');
  private apiToken: string;
  private baseUrl: string;
  private disabled: boolean = false;

  constructor() {
    this.baseUrl = process.env.WASENDER_API_URL || 'https://www.wasenderapi.com/api';
    this.apiToken = process.env.WASENDER_API_TOKEN || '';

    if (!this.apiToken) {
      // No lanzar excepción: modo deshabilitado
      this.logger.warn('WASENDER_API_TOKEN is not configured - WasenderService running in disabled mode');
      this.disabled = true;
      // Crear instancia dummy mínima para evitar null checks posteriores
      this.axiosInstance = axios.create({ baseURL: this.baseUrl });
      return;
    }

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: parseInt(process.env.DEFAULT_TIMEOUT_MS || '30000'),
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
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
      const baseMessage = data?.message || data?.error || 'Wasender API error';

      // Map status codes to specific AppError subclasses where aplicable
      if (status === 401) {
        return new UnauthorizedError(`Wasender auth failed: ${baseMessage}`);
      }
      if (status === 403) {
        return new ForbiddenError(`Wasender permission denied: ${baseMessage}`);
      }

      // Validation style errors (422 / 400)
      if (status === 400 || status === 422) {
        const details: string[] = [];
        if (data?.errors) {
          try {
            const validationErrors = Object.values(data.errors).flat();
            details.push(...(validationErrors as any));
          } catch (_) { /* ignore */ }
        }
        const message = details.length
          ? `${baseMessage} - ${details.join(', ')}`
          : baseMessage;
        return new AppError(message, 400, 'WASENDER_VALIDATION_ERROR');
      }

      // Demás códigos => AppError con status original si es 4xx, o 502 si es 5xx externo
      const statusCode = status >= 500 ? 502 : status;
      return new AppError(`Wasender API error (${status}): ${baseMessage}`, statusCode, 'WASENDER_API_ERROR');
    }

    if (error.code) {
      return new AppError(`Network error: ${error.code}`, 502, 'WASENDER_NETWORK_ERROR');
    }

    return new AppError(error.message || 'Unknown Wasender API error', 502, 'WASENDER_UNKNOWN_ERROR');
  }

  /**
   * Construye payload estándar de envío soportando campos legacy y oficiales.
   */
  private buildSendPayload(base: WasenderMessage): WasenderMessage {
    // Normalizar alias filename/fileName
    if (base.filename && !base.fileName) {
      (base as any).fileName = base.filename;
    } else if (base.fileName && !base.filename) {
      (base as any).filename = base.fileName; // mantener duplicado para compatibilidad interna
    }

    // Copiar valores legacy a oficiales si sólo legacy viene y viceversa
    if (base.image && !base.imageUrl) base.imageUrl = base.image;
    if (base.imageUrl && !base.image) base.image = base.imageUrl;
    if (base.video && !base.videoUrl) base.videoUrl = base.video;
    if (base.videoUrl && !base.video) base.video = base.videoUrl;
    if (base.document && !base.documentUrl) base.documentUrl = base.document;
    if (base.documentUrl && !base.document) base.document = base.documentUrl;
    if (base.audio && !base.audioUrl) base.audioUrl = base.audio;
    if (base.audioUrl && !base.audio) base.audio = base.audioUrl;
    return base;
  }

  /**
   * Envío genérico al endpoint oficial /send-message (reemplaza /messages).
   */
  private async postSendMessage(operation: string, payload: WasenderMessage): Promise<WasenderResponse> {
    const finalPayload = this.buildSendPayload({ ...payload });
    const response = await this.axiosInstance.post<WasenderResponse>('/send-message', finalPayload);
    this.logger.serviceOperation(operation, 'success', {
      messageId: response.data.data?.id,
      status: response.data.data?.status
    });
    return response.data;
  }

  /** Envía un mensaje de texto */
  async sendTextMessage(phoneNumber: string, message: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Sending text message', { to: phoneNumber, messageLength: message.length });
      return this.postSendMessage('sendTextMessage', { to: phoneNumber, text: message });
    }, 'sendTextMessage');
  }

  /**
   * Envía un mensaje con imagen
   */
  async sendImageMessage(phoneNumber: string, imageUrl: string, caption?: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Sending image message', { to: phoneNumber, imageUrl, hasCaption: !!caption });
      return this.postSendMessage('sendImageMessage', { to: phoneNumber, imageUrl, image: imageUrl, caption });
    }, 'sendImageMessage');
  }

  /**
   * Envía un mensaje con documento
   */
  async sendDocumentMessage(phoneNumber: string, documentUrl: string, filename?: string, caption?: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Sending document message', { to: phoneNumber, documentUrl, filename, hasCaption: !!caption });
      return this.postSendMessage('sendDocumentMessage', { to: phoneNumber, documentUrl, document: documentUrl, fileName: filename, filename, caption });
    }, 'sendDocumentMessage');
  }

  /**
   * Envía un mensaje con audio
   */
  async sendAudioMessage(phoneNumber: string, audioUrl: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Sending audio message', { to: phoneNumber, audioUrl });
      return this.postSendMessage('sendAudioMessage', { to: phoneNumber, audioUrl, audio: audioUrl });
    }, 'sendAudioMessage');
  }

  /**
   * Envía un mensaje con video
   */
  async sendVideoMessage(phoneNumber: string, videoUrl: string, caption?: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Sending video message', { to: phoneNumber, videoUrl, hasCaption: !!caption });
      return this.postSendMessage('sendVideoMessage', { to: phoneNumber, videoUrl, video: videoUrl, caption });
    }, 'sendVideoMessage');
  }

  /**
   * Envía un mensaje basado en el tipo especificado
   */
  async sendMessage(request: SendMessageRequest): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new ServiceUnavailableError('Wasender');
    }
    const { phoneNumber, messageType } = request;

    this.logger.info('Processing send message request', {
      phoneNumber,
      messageType
    });

    switch (messageType) {
      case 'text':
        if (!request.message) {
          throw new Error('Message text is required for text messages');
        }
  return this.sendTextMessage(phoneNumber, request.message);

      case 'image':
        if (!request.imageUrl) {
          throw new Error('Image URL is required for image messages');
        }
  return this.sendImageMessage(phoneNumber, request.imageUrl, request.caption);

      case 'document':
        if (!request.documentUrl) {
          throw new Error('Document URL is required for document messages');
        }
  return this.sendDocumentMessage(phoneNumber, request.documentUrl, request.filename || request.fileName, request.caption);

      case 'audio':
        if (!request.audioUrl) {
          throw new Error('Audio URL is required for audio messages');
        }
  return this.sendAudioMessage(phoneNumber, request.audioUrl);

      case 'video':
        if (!request.videoUrl) {
          throw new Error('Video URL is required for video messages');
        }
        return this.sendVideoMessage(phoneNumber, request.videoUrl, request.caption);

      default:
        throw new Error(`Unsupported message type: ${messageType}`);
    }
  }

  /**
   * Obtiene información detallada de un mensaje por ID
   */
  async getMessageInfo(messageId: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Fetching message info', { messageId });
      const response = await this.axiosInstance.get<WasenderResponse>(`/messages/${messageId}/info`);
      this.logger.serviceOperation('getMessageInfo', 'success', { messageId });
      return response.data;
    }, 'getMessageInfo');
  }

  /**
   * Obtiene todas las sesiones de WhatsApp
   */
  async getSessions(): Promise<WasenderSession[]> {
    if (this.disabled) {
      throw new ServiceUnavailableError('Wasender');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Fetching WhatsApp sessions');

      const response = await this.axiosInstance.get<WasenderSession[]>('/whatsapp-sessions');

      this.logger.serviceOperation('getSessions', 'success', {
        sessionCount: response.data.length
      });

      return response.data;
    }, 'getSessions');
  }

  /**
   * Obtiene información de una sesión específica
   */
  async getSessionInfo(sessionId: string): Promise<WasenderSession> {
    if (this.disabled) {
      throw new ServiceUnavailableError('Wasender');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Fetching session info', { sessionId });

      const response = await this.axiosInstance.get<WasenderSession>(`/whatsapp-sessions/${sessionId}`);

      this.logger.serviceOperation('getSessionInfo', 'success', {
        sessionId,
        status: response.data.status
      });

      return response.data;
    }, 'getSessionInfo');
  }

  /**
   * Conecta una sesión de WhatsApp
   */
  async connectSession(sessionId: string): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Connecting WhatsApp session', { sessionId });

      const response = await this.axiosInstance.post<WasenderResponse>(`/whatsapp-sessions/${sessionId}/connect`, {});

      this.logger.serviceOperation('connectSession', 'success', {
        sessionId,
        response: response.data
      });

      return response.data;
    }, 'connectSession');
  }

  /**
   * Desconecta una sesión de WhatsApp
   */
  async disconnectSession(sessionId: string): Promise<WasenderResponse> {
  if (this.disabled) throw new ServiceUnavailableError('Wasender');
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Disconnecting WhatsApp session', { sessionId });
      const response = await this.axiosInstance.post<WasenderResponse>(`/whatsapp-sessions/${sessionId}/disconnect`, {});
      this.logger.serviceOperation('disconnectSession', 'success', { sessionId });
      return response.data;
    }, 'disconnectSession');
  }

  /**
   * Crea una nueva sesión de WhatsApp
   */
  async createSession(sessionData: Partial<WasenderSession>): Promise<WasenderSession> {
    if (this.disabled) {
      throw new ServiceUnavailableError('Wasender');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Creating new WhatsApp session', { sessionData });

      const response = await this.axiosInstance.post<WasenderSession>('/whatsapp-sessions', sessionData);

      this.logger.serviceOperation('createSession', 'success', {
        sessionId: response.data.id,
        status: response.data.status
      });

      return response.data;
    }, 'createSession');
  }

  /**
   * Actualiza una sesión de WhatsApp
   */
  async updateSession(sessionId: string, sessionData: Partial<WasenderSession>): Promise<WasenderSession> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Updating WhatsApp session', { sessionId, sessionData });

      const response = await this.axiosInstance.put<WasenderSession>(`/whatsapp-sessions/${sessionId}`, sessionData);

      this.logger.serviceOperation('updateSession', 'success', {
        sessionId,
        status: response.data.status
      });

      return response.data;
    }, 'updateSession');
  }

  /**
   * Verifica el estado de conexión
   */
  async checkConnectionStatus(): Promise<boolean> {
    if (this.disabled) {
      this.logger.warn('checkConnectionStatus called while service disabled');
      return false;
    }
    try {
      const sessions = await this.getSessions();
      const hasConnectedSession = sessions.some(session => session.status === 'connected');

      this.logger.info('Connection status check completed', {
        totalSessions: sessions.length,
        hasConnectedSession,
        connectedSessions: sessions.filter(s => s.status === 'connected').length
      });

      return hasConnectedSession;
    } catch (error) {
      this.logger.error('Failed to check connection status', error);
      throw error;
    }
  }

  /**
   * Obtiene información de la cuenta
   */
  async getAccountInfo(): Promise<WasenderAccountInfo> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      this.logger.info('Fetching account information');

      const response = await this.axiosInstance.get<WasenderAccountInfo>('/user');

      this.logger.serviceOperation('getAccountInfo', 'success', {
        plan: response.data.plan,
        creditsRemaining: response.data.credits_remaining
      });

      return response.data;
    }, 'getAccountInfo');
  }

  /**
   * Valida que el servicio esté configurado correctamente
   */
  async validateConfiguration(): Promise<boolean> {
    if (this.disabled) {
      this.logger.warn('Wasender service disabled - skipping configuration validation');
      return false; // Indica no disponible, pero no bloquea arranque
    }
    try {
      await this.getAccountInfo();
      this.logger.info('Wasender service configuration is valid');
      return true;
    } catch (error) {
      this.logger.error('Wasender service configuration is invalid', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getServiceStats(): object {
    return {
      baseUrl: this.baseUrl,
      hasApiToken: !!this.apiToken,
      configuredTimeout: this.axiosInstance.defaults.timeout,
      disabled: this.disabled
    };
  }
}

export default WasenderService;