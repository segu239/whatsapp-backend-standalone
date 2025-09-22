import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import WasenderService from '../services/wasender.service';

export class WasenderController {
  private logger = createLogger('WasenderController');
  private wasenderService: WasenderService;

  constructor() {
    this.wasenderService = new WasenderService();
  }

  /**
   * Obtiene todas las sesiones de WhatsApp
   * GET /api/v1/wasender/sessions
   */
  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Fetching WhatsApp sessions');

      const sessions = await this.wasenderService.getSessions();

      this.logger.info('WhatsApp sessions fetched successfully', {
        sessionCount: sessions.length,
        connectedSessions: sessions.filter(s => s.status === 'connected').length
      });

      res.status(200).json({
        success: true,
        data: sessions,
        stats: {
          total: sessions.length,
          connected: sessions.filter(s => s.status === 'connected').length,
          disconnected: sessions.filter(s => s.status === 'disconnected').length,
          connecting: sessions.filter(s => s.status === 'connecting').length,
          qrCode: sessions.filter(s => s.status === 'qr_code').length
        },
        message: 'Sessions retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch WhatsApp sessions', {
        error: error.message
      });
      next(error);
    }
  };

  /**
   * Obtiene información de una sesión específica
   * GET /api/v1/wasender/sessions/:id
   */
  getSessionInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;

      this.logger.info('Fetching session info', { sessionId });

      const session = await this.wasenderService.getSessionInfo(sessionId);

      this.logger.info('Session info fetched successfully', {
        sessionId,
        status: session.status,
        phoneNumber: session.phone_number
      });

      res.status(200).json({
        success: true,
        data: session,
        message: 'Session info retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch session info', {
        error: error.message,
        sessionId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Conecta una sesión de WhatsApp
   * POST /api/v1/wasender/sessions/:id/connect
   */
  connectSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;

      this.logger.info('Connecting WhatsApp session', { sessionId });

      const result = await this.wasenderService.connectSession(sessionId);

      this.logger.info('Session connection initiated', {
        sessionId,
        success: result.success
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Session connection initiated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to connect session', {
        error: error.message,
        sessionId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Desconecta una sesión de WhatsApp
   * POST /api/v1/wasender/sessions/:id/disconnect
   */
  disconnectSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;

      this.logger.info('Disconnecting WhatsApp session', { sessionId });

      const result = await this.wasenderService.disconnectSession(sessionId);

      this.logger.info('Session disconnection initiated', {
        sessionId,
        success: result.success
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Session disconnection initiated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to disconnect session', {
        error: (error as any).message,
        sessionId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Crea una nueva sesión de WhatsApp
   * POST /api/v1/wasender/sessions
   */
  createSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionData = req.body;

      this.logger.info('Creating new WhatsApp session', {
        sessionName: sessionData.name
      });

      // Validaciones básicas
      if (!sessionData.name) {
        res.status(400).json({
          success: false,
          error: 'Session name is required'
        });
        return;
      }

      const result = await this.wasenderService.createSession(sessionData);

      this.logger.info('Session created successfully', {
        sessionId: result.id,
        sessionName: result.name,
        status: result.status
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Session created successfully'
      });

    } catch (error) {
      this.logger.error('Failed to create session', {
        error: error.message,
        sessionData: req.body
      });
      next(error);
    }
  };

  /**
   * Actualiza una sesión de WhatsApp
   * PUT /api/v1/wasender/sessions/:id
   */
  updateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.id;
      const updateData = req.body;

      this.logger.info('Updating WhatsApp session', {
        sessionId,
        updateFields: Object.keys(updateData)
      });

      const result = await this.wasenderService.updateSession(sessionId, updateData);

      this.logger.info('Session updated successfully', {
        sessionId,
        status: result.status
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Session updated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to update session', {
        error: error.message,
        sessionId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Verifica el estado de conexión general
   * GET /api/v1/wasender/connection-status
   */
  checkConnectionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Checking WhatsApp connection status');

      const isConnected = await this.wasenderService.checkConnectionStatus();

      this.logger.info('Connection status checked', { isConnected });

      res.status(200).json({
        success: true,
        data: {
          isConnected,
          status: isConnected ? 'connected' : 'disconnected',
          timestamp: new Date().toISOString()
        },
        message: 'Connection status retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to check connection status', {
        error: error.message
      });
      next(error);
    }
  };

  /**
   * Obtiene información de la cuenta Wasender
   * GET /api/v1/wasender/account
   */
  getAccountInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Fetching Wasender account information');

      const accountInfo = await this.wasenderService.getAccountInfo();

      this.logger.info('Account info fetched successfully', {
        plan: accountInfo.plan,
        creditsRemaining: accountInfo.credits_remaining
      });

      res.status(200).json({
        success: true,
        data: accountInfo,
        message: 'Account information retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch account info', {
        error: error.message
      });
      next(error);
    }
  };

  /**
   * Valida la configuración del servicio Wasender
   * GET /api/v1/wasender/validate-config
   */
  validateConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Validating Wasender configuration');

      const isValid = await this.wasenderService.validateConfiguration();

      this.logger.info('Configuration validation completed', { isValid });

      res.status(200).json({
        success: true,
        data: {
          isValid,
          timestamp: new Date().toISOString()
        },
        message: isValid ? 'Configuration is valid' : 'Configuration is invalid'
      });

    } catch (error) {
      this.logger.error('Failed to validate configuration', {
        error: error.message
      });
      next(error);
    }
  };

  /**
   * Obtiene información detallada de un mensaje (Wasender)
   * GET /api/v1/wasender/messages/:id
   */
  getMessageInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messageId = req.params.id;
      this.logger.info('Fetching Wasender message info', { messageId });
      const result = await this.wasenderService.getMessageInfo(messageId);
      this.logger.info('Message info fetched successfully', { messageId });
      res.status(200).json({
        success: true,
        data: result,
        message: 'Message info retrieved successfully'
      });
    } catch (error) {
      this.logger.error('Failed to fetch message info', {
        error: (error as any).message,
        messageId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Obtiene estadísticas del servicio Wasender
   * GET /api/v1/wasender/stats
   */
  getServiceStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Fetching Wasender service statistics');

      const stats = this.wasenderService.getServiceStats();

      this.logger.info('Service statistics fetched successfully');

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Service statistics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch service statistics', {
        error: error.message
      });
      next(error);
    }
  };

  /**
   * Health check específico para Wasender
   * GET /api/v1/wasender/health
   */
  healthCheck = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Performing Wasender health check');

      const startTime = Date.now();

      // Intentar hacer una llamada simple para verificar conectividad
      const isHealthy = await this.wasenderService.validateConfiguration();

      const responseTime = Date.now() - startTime;

      const healthData = {
        service: 'wasender',
        status: isHealthy ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        checks: {
          apiConnection: isHealthy,
          authentication: isHealthy
        }
      };

      this.logger.info('Wasender health check completed', healthData);

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: healthData,
        message: isHealthy ? 'Wasender service is healthy' : 'Wasender service is unhealthy'
      });

    } catch (error) {
      this.logger.error('Wasender health check failed', {
        error: error.message
      });

      res.status(503).json({
        success: false,
        data: {
          service: 'wasender',
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        },
        message: 'Wasender service health check failed'
      });
    }
  };
}

export default WasenderController;