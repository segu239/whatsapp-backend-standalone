import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';
import WasenderService from '../services/wasender.service';
import CronhooksService from '../services/cronhooks.service';
import NotificationService from '../services/notification.service';
import { SendMessageRequest, ScheduleMessageRequest } from '../interfaces/wasender.interface';

export class MessagesController {
  private logger = createLogger('MessagesController');
  private wasenderService: WasenderService;
  private cronhooksService: CronhooksService;
  private notificationService: NotificationService;

  constructor() {
    this.wasenderService = new WasenderService();
    this.cronhooksService = new CronhooksService();
    this.notificationService = new NotificationService();
  }

  /**
   * Envía un mensaje inmediato
   * POST /api/v1/messages/send
   */
  sendMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messageRequest: SendMessageRequest = req.body;

      this.logger.info('Processing immediate message send request', {
        phoneNumber: messageRequest.phoneNumber,
        messageType: messageRequest.messageType,
        requestId: req.headers['x-request-id']
      });

      // Validaciones básicas
      if (!messageRequest.phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
        return;
      }

      if (!messageRequest.messageType) {
        res.status(400).json({
          success: false,
          error: 'Message type is required'
        });
        return;
      }

      // Enviar mensaje a través del servicio Wasender
      const result = await this.wasenderService.sendMessage(messageRequest);

      // Notificar éxito si es necesario
      if (result.success) {
        await this.notificationService.notifyMessageSuccess(
          messageRequest.phoneNumber,
          result.data?.id,
          { messageType: messageRequest.messageType }
        );
      }

      this.logger.info('Message sent successfully', {
        phoneNumber: messageRequest.phoneNumber,
        messageId: result.data?.id,
        status: result.data?.status
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Message sent successfully'
      });

    } catch (error) {
      this.logger.error('Failed to send message', {
        error: error.message,
        phoneNumber: req.body.phoneNumber,
        messageType: req.body.messageType
      });

      // Notificar fallo
      await this.notificationService.notifyMessageFailure(
        req.body.phoneNumber,
        error,
        { messageType: req.body.messageType }
      );

      next(error);
    }
  };

  /**
   * Programa un mensaje único
   * POST /api/v1/messages/schedule
   */
  scheduleMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleRequest: ScheduleMessageRequest = req.body;

      this.logger.info('Processing schedule message request', {
        phoneNumber: scheduleRequest.phoneNumber,
        contactName: scheduleRequest.contactName,
        isRecurring: scheduleRequest.isRecurring,
        scheduledDateTime: scheduleRequest.scheduledDateTime,
        requestId: req.headers['x-request-id']
      });

      // Validaciones básicas
      if (!scheduleRequest.phoneNumber) {
        res.status(400).json({
          success: false,
          error: 'Phone number is required'
        });
        return;
      }

      if (!scheduleRequest.message) {
        res.status(400).json({
          success: false,
          error: 'Message is required'
        });
        return;
      }

      if (!scheduleRequest.contactName) {
        res.status(400).json({
          success: false,
          error: 'Contact name is required'
        });
        return;
      }

      // Validaciones específicas para mensajes únicos
      if (!scheduleRequest.isRecurring && !scheduleRequest.scheduledDateTime) {
        res.status(400).json({
          success: false,
          error: 'Scheduled date time is required for one-time messages'
        });
        return;
      }

      // Validaciones específicas para mensajes recurrentes
      if (scheduleRequest.isRecurring && !scheduleRequest.cronExpression) {
        res.status(400).json({
          success: false,
          error: 'Cron expression is required for recurring messages'
        });
        return;
      }

      // Crear schedule en Cronhooks
      const result = await this.cronhooksService.createSchedule(scheduleRequest);

      this.logger.info('Message scheduled successfully', {
        scheduleId: result.id,
        phoneNumber: scheduleRequest.phoneNumber,
        contactName: scheduleRequest.contactName,
        isRecurring: scheduleRequest.isRecurring
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Message scheduled successfully'
      });

    } catch (error) {
      this.logger.error('Failed to schedule message', {
        error: error.message,
        phoneNumber: req.body.phoneNumber,
        contactName: req.body.contactName
      });

      // Notificar fallo
      await this.notificationService.notifyScheduleFailure(
        'unknown',
        error,
        {
          phoneNumber: req.body.phoneNumber,
          contactName: req.body.contactName
        }
      );

      next(error);
    }
  };

  /**
   * Programa un mensaje recurrente
   * POST /api/v1/messages/schedule-recurring
   */
  scheduleRecurringMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleRequest: ScheduleMessageRequest = {
        ...req.body,
        isRecurring: true
      };

      // Reutilizar la lógica del método scheduleMessage
      req.body = scheduleRequest;
      await this.scheduleMessage(req, res, next);

    } catch (error) {
      next(error);
    }
  };

  /**
   * Obtiene todas las programaciones
   * GET /api/v1/messages/schedules
   */
  getSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const skip = parseInt(req.query.skip as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;

      this.logger.info('Fetching schedules', { skip, limit });

      const result = await this.cronhooksService.listSchedules(skip, limit);

      this.logger.info('Schedules fetched successfully', {
        totalSchedules: result.pagination.total,
        returnedCount: result.data.length
      });

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
        message: 'Schedules retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch schedules', { error: error.message });
      next(error);
    }
  };

  /**
   * Obtiene un schedule específico
   * GET /api/v1/messages/schedules/:id
   */
  getSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleId = req.params.id;

      this.logger.info('Fetching schedule', { scheduleId });

      const result = await this.cronhooksService.getSchedule(scheduleId);

      this.logger.info('Schedule fetched successfully', {
        scheduleId,
        status: result.status
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch schedule', {
        error: error.message,
        scheduleId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Actualiza un schedule
   * PUT /api/v1/messages/schedules/:id
   */
  updateSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleId = req.params.id;
      const updateData = req.body;

      this.logger.info('Updating schedule', {
        scheduleId,
        updateFields: Object.keys(updateData)
      });

      const result = await this.cronhooksService.updateSchedule(scheduleId, updateData);

      this.logger.info('Schedule updated successfully', { scheduleId });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule updated successfully'
      });

    } catch (error) {
      this.logger.error('Failed to update schedule', {
        error: error.message,
        scheduleId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Elimina un schedule
   * DELETE /api/v1/messages/schedules/:id
   */
  deleteSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleId = req.params.id;

      this.logger.info('Deleting schedule', { scheduleId });

      const result = await this.cronhooksService.deleteSchedule(scheduleId);

      this.logger.info('Schedule deleted successfully', { scheduleId });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule deleted successfully'
      });

    } catch (error) {
      this.logger.error('Failed to delete schedule', {
        error: error.message,
        scheduleId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Pausa un schedule
   * POST /api/v1/messages/schedules/:id/pause
   */
  pauseSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleId = req.params.id;

      this.logger.info('Pausing schedule', { scheduleId });

      const result = await this.cronhooksService.pauseSchedule(scheduleId);

      this.logger.info('Schedule paused successfully', { scheduleId });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule paused successfully'
      });

    } catch (error) {
      this.logger.error('Failed to pause schedule', {
        error: error.message,
        scheduleId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Reanuda un schedule
   * POST /api/v1/messages/schedules/:id/resume
   */
  resumeSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleId = req.params.id;

      this.logger.info('Resuming schedule', { scheduleId });

      const result = await this.cronhooksService.resumeSchedule(scheduleId);

      this.logger.info('Schedule resumed successfully', { scheduleId });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule resumed successfully'
      });

    } catch (error) {
      this.logger.error('Failed to resume schedule', {
        error: error.message,
        scheduleId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Ejecuta un schedule manualmente
   * POST /api/v1/messages/schedules/:id/trigger
   */
  triggerSchedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scheduleId = req.params.id;

      this.logger.info('Triggering schedule manually', { scheduleId });

      const result = await this.cronhooksService.triggerSchedule(scheduleId);

      this.logger.info('Schedule triggered successfully', { scheduleId });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Schedule triggered successfully'
      });

    } catch (error) {
      this.logger.error('Failed to trigger schedule', {
        error: error.message,
        scheduleId: req.params.id
      });
      next(error);
    }
  };

  /**
   * Obtiene estadísticas de schedules
   * GET /api/v1/messages/schedules/stats
   */
  getScheduleStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.logger.info('Fetching schedule statistics');

      const stats = await this.cronhooksService.getGeneralStats();

      this.logger.info('Schedule statistics fetched successfully', stats);

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Schedule statistics retrieved successfully'
      });

    } catch (error) {
      this.logger.error('Failed to fetch schedule statistics', {
        error: error.message
      });
      next(error);
    }
  };
}

export default MessagesController;