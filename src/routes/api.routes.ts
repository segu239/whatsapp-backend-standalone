import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { WasenderController } from '../controllers/wasender.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation.middleware';
import { ErrorMiddleware } from '../middleware/error.middleware';

const router = Router();

// Instanciar controllers
const messagesController = new MessagesController();
const wasenderController = new WasenderController();

// Aplicar autenticación a todas las rutas de la API
router.use(AuthMiddleware.authenticate);

// ============================================================================
// RUTAS DE MENSAJES
// ============================================================================

/**
 * @route   POST /api/v1/messages/send
 * @desc    Envía un mensaje inmediato
 * @access  Private (requiere API key)
 */
router.post('/messages/send',
  ValidationMiddleware.validateBody(ValidationSchemas.sendMessage),
  ErrorMiddleware.asyncHandler(messagesController.sendMessage)
);

/**
 * @route   POST /api/v1/messages/schedule
 * @desc    Programa un mensaje único
 * @access  Private (requiere API key)
 */
router.post('/messages/schedule',
  ValidationMiddleware.validateBody(ValidationSchemas.scheduleMessage),
  ErrorMiddleware.asyncHandler(messagesController.scheduleMessage)
);

/**
 * @route   POST /api/v1/messages/schedule-recurring
 * @desc    Programa un mensaje recurrente
 * @access  Private (requiere API key)
 */
router.post('/messages/schedule-recurring',
  ValidationMiddleware.validateBody(ValidationSchemas.scheduleMessage),
  ErrorMiddleware.asyncHandler(messagesController.scheduleRecurringMessage)
);

/**
 * @route   GET /api/v1/messages/schedules
 * @desc    Obtiene todas las programaciones con paginación
 * @access  Private (requiere API key)
 */
router.get('/messages/schedules',
  ValidationMiddleware.validateQuery(ValidationSchemas.pagination),
  ErrorMiddleware.asyncHandler(messagesController.getSchedules)
);

/**
 * @route   GET /api/v1/messages/schedules/stats
 * @desc    Obtiene estadísticas de schedules
 * @access  Private (requiere API key)
 */
router.get('/messages/schedules/stats',
  ErrorMiddleware.asyncHandler(messagesController.getScheduleStats)
);

/**
 * @route   GET /api/v1/messages/schedules/:id
 * @desc    Obtiene un schedule específico por ID
 * @access  Private (requiere API key)
 */
router.get('/messages/schedules/:id',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(messagesController.getSchedule)
);

/**
 * @route   PUT /api/v1/messages/schedules/:id
 * @desc    Actualiza un schedule
 * @access  Private (requiere API key)
 */
router.put('/messages/schedules/:id',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ValidationMiddleware.validateBody(ValidationSchemas.updateSchedule),
  ErrorMiddleware.asyncHandler(messagesController.updateSchedule)
);

/**
 * @route   DELETE /api/v1/messages/schedules/:id
 * @desc    Elimina un schedule
 * @access  Private (requiere API key)
 */
router.delete('/messages/schedules/:id',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(messagesController.deleteSchedule)
);

/**
 * @route   POST /api/v1/messages/schedules/:id/pause
 * @desc    Pausa un schedule
 * @access  Private (requiere API key)
 */
router.post('/messages/schedules/:id/pause',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(messagesController.pauseSchedule)
);

/**
 * @route   POST /api/v1/messages/schedules/:id/resume
 * @desc    Reanuda un schedule
 * @access  Private (requiere API key)
 */
router.post('/messages/schedules/:id/resume',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(messagesController.resumeSchedule)
);

/**
 * @route   POST /api/v1/messages/schedules/:id/trigger
 * @desc    Ejecuta un schedule manualmente
 * @access  Private (requiere API key)
 */
router.post('/messages/schedules/:id/trigger',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(messagesController.triggerSchedule)
);

// ============================================================================
// RUTAS DE WASENDER (WhatsApp)
// ============================================================================

/**
 * @route   GET /api/v1/wasender/sessions
 * @desc    Obtiene todas las sesiones de WhatsApp
 * @access  Private (requiere API key)
 */
router.get('/wasender/sessions',
  ErrorMiddleware.asyncHandler(wasenderController.getSessions)
);

/**
 * @route   GET /api/v1/wasender/sessions/:id
 * @desc    Obtiene información de una sesión específica
 * @access  Private (requiere API key)
 */
router.get('/wasender/sessions/:id',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(wasenderController.getSessionInfo)
);

/**
 * @route   POST /api/v1/wasender/sessions/:id/connect
 * @desc    Conecta una sesión de WhatsApp
 * @access  Private (requiere API key)
 */
router.post('/wasender/sessions/:id/connect',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ErrorMiddleware.asyncHandler(wasenderController.connectSession)
);

/**
 * @route   POST /api/v1/wasender/sessions
 * @desc    Crea una nueva sesión de WhatsApp
 * @access  Private (requiere API key)
 */
router.post('/wasender/sessions',
  ValidationMiddleware.validateBody(ValidationSchemas.createSession),
  ErrorMiddleware.asyncHandler(wasenderController.createSession)
);

/**
 * @route   PUT /api/v1/wasender/sessions/:id
 * @desc    Actualiza una sesión de WhatsApp
 * @access  Private (requiere API key)
 */
router.put('/wasender/sessions/:id',
  ValidationMiddleware.validateParams(ValidationSchemas.idParam),
  ValidationMiddleware.validateBody(ValidationSchemas.updateSession),
  ErrorMiddleware.asyncHandler(wasenderController.updateSession)
);

/**
 * @route   GET /api/v1/wasender/connection-status
 * @desc    Verifica el estado de conexión general de WhatsApp
 * @access  Private (requiere API key)
 */
router.get('/wasender/connection-status',
  ErrorMiddleware.asyncHandler(wasenderController.checkConnectionStatus)
);

/**
 * @route   GET /api/v1/wasender/account
 * @desc    Obtiene información de la cuenta Wasender
 * @access  Private (requiere API key)
 */
router.get('/wasender/account',
  ErrorMiddleware.asyncHandler(wasenderController.getAccountInfo)
);

/**
 * @route   GET /api/v1/wasender/validate-config
 * @desc    Valida la configuración del servicio Wasender
 * @access  Private (requiere API key)
 */
router.get('/wasender/validate-config',
  ErrorMiddleware.asyncHandler(wasenderController.validateConfiguration)
);

/**
 * @route   GET /api/v1/wasender/stats
 * @desc    Obtiene estadísticas del servicio Wasender
 * @access  Private (requiere API key)
 */
router.get('/wasender/stats',
  ErrorMiddleware.asyncHandler(wasenderController.getServiceStats)
);

/**
 * @route   GET /api/v1/wasender/health
 * @desc    Health check específico para Wasender
 * @access  Private (requiere API key)
 */
router.get('/wasender/health',
  ErrorMiddleware.asyncHandler(wasenderController.healthCheck)
);

export default router;