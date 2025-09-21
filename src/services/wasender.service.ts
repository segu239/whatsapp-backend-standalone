import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { createLogger } from '../utils/logger';
import { RetryUtil } from '../utils/retry.util';
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
      let message = `Wasender API error (${status})`;

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

    return new Error(error.message || 'Unknown Wasender API error');
  }

  /**
   * Envía un mensaje de texto
   */
  async sendTextMessage(phoneNumber: string, message: string): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      const payload: WasenderMessage = {
        to: phoneNumber,
        text: message
      };

      this.logger.info('Sending text message', {
        to: phoneNumber,
        messageLength: message.length
      });

      const response = await this.axiosInstance.post<WasenderResponse>('/messages', payload);

      this.logger.serviceOperation('sendTextMessage', 'success', {
        messageId: response.data.data?.id,
        status: response.data.data?.status
      });

      return response.data;
    }, 'sendTextMessage');
  }

  /**
   * Envía un mensaje con imagen
   */
  async sendImageMessage(phoneNumber: string, imageUrl: string, caption?: string): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      const payload: WasenderMessage = {
        to: phoneNumber,
        image: imageUrl,
        caption: caption || ""
      };

      this.logger.info('Sending image message', {
        to: phoneNumber,
        imageUrl,
        hasCaption: !!caption
      });

      const response = await this.axiosInstance.post<WasenderResponse>('/messages', payload);

      this.logger.serviceOperation('sendImageMessage', 'success', {
        messageId: response.data.data?.id,
        status: response.data.data?.status
      });

      return response.data;
    }, 'sendImageMessage');
  }

  /**
   * Envía un mensaje con documento
   */
  async sendDocumentMessage(phoneNumber: string, documentUrl: string, filename?: string, caption?: string): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      const payload: WasenderMessage = {
        to: phoneNumber,
        document: documentUrl,
        filename: filename || "document",
        caption: caption || ""
      };

      this.logger.info('Sending document message', {
        to: phoneNumber,
        documentUrl,
        filename,
        hasCaption: !!caption
      });

      const response = await this.axiosInstance.post<WasenderResponse>('/messages', payload);

      this.logger.serviceOperation('sendDocumentMessage', 'success', {
        messageId: response.data.data?.id,
        status: response.data.data?.status
      });

      return response.data;
    }, 'sendDocumentMessage');
  }

  /**
   * Envía un mensaje con audio
   */
  async sendAudioMessage(phoneNumber: string, audioUrl: string): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      const payload: WasenderMessage = {
        to: phoneNumber,
        audio: audioUrl
      };

      this.logger.info('Sending audio message', {
        to: phoneNumber,
        audioUrl
      });

      const response = await this.axiosInstance.post<WasenderResponse>('/messages', payload);

      this.logger.serviceOperation('sendAudioMessage', 'success', {
        messageId: response.data.data?.id,
        status: response.data.data?.status
      });

      return response.data;
    }, 'sendAudioMessage');
  }

  /**
   * Envía un mensaje con video
   */
  async sendVideoMessage(phoneNumber: string, videoUrl: string, caption?: string): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
    }
    return RetryUtil.executeWasenderOperation(async () => {
      const payload: WasenderMessage = {
        to: phoneNumber,
        video: videoUrl,
        caption: caption || ""
      };

      this.logger.info('Sending video message', {
        to: phoneNumber,
        videoUrl,
        hasCaption: !!caption
      });

      const response = await this.axiosInstance.post<WasenderResponse>('/messages', payload);

      this.logger.serviceOperation('sendVideoMessage', 'success', {
        messageId: response.data.data?.id,
        status: response.data.data?.status
      });

      return response.data;
    }, 'sendVideoMessage');
  }

  /**
   * Envía un mensaje basado en el tipo especificado
   */
  async sendMessage(request: SendMessageRequest): Promise<WasenderResponse> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
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
        return this.sendDocumentMessage(phoneNumber, request.documentUrl, request.filename, request.caption);

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
   * Obtiene todas las sesiones de WhatsApp
   */
  async getSessions(): Promise<WasenderSession[]> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
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
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
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
   * Crea una nueva sesión de WhatsApp
   */
  async createSession(sessionData: Partial<WasenderSession>): Promise<WasenderSession> {
    if (this.disabled) {
      throw new Error('WasenderService disabled (missing WASENDER_API_TOKEN)');
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