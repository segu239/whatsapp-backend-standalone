import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger, defaultLogger } from './utils/logger';

// Importar rutas
import apiRoutes from './routes/api.routes';
import webhookRoutes from './routes/webhook.routes';

// Importar middleware
import { ErrorMiddleware } from './middleware/error.middleware';
import { AuthMiddleware } from './middleware/auth.middleware';

// Importar servicios para verificación inicial
import WasenderService from './services/wasender.service';
import CronhooksService from './services/cronhooks.service';
import NotificationService from './services/notification.service';

// Configurar variables de entorno
dotenv.config();

class App {
  public app: Application;
  private logger = createLogger('App');
  private wasenderService?: WasenderService;
  private cronhooksService?: CronhooksService;
  private notificationService?: NotificationService;

  constructor() {
    this.app = express();

    // ULTRA-BÁSICO: healthz disponible INMEDIATAMENTE sin dependencias
    this.app.get('/healthz', (req, res) => {
      res.status(200).json({ status: 'ok', uptime: process.uptime() });
    });

    try {
      this.initializeServices();
      this.initializeMiddlewares();
      this.initializeRoutes();
      this.initializeErrorHandling();
      this.initializeHealthChecks();
    } catch (error) {
      // Continuar aunque falle la inicialización - healthz seguirá funcionando
      console.error('Initialization failed but continuing:', error);
    }
  }


  /**
   * Inicializa los servicios principales
   */
  private initializeServices(): void {
    try {
      this.logger.info('Initializing services...');

      // Inicializar servicios
      this.wasenderService = new WasenderService();
      this.cronhooksService = new CronhooksService();
      this.notificationService = new NotificationService();

      this.logger.info('Services initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize services - continuing with degraded mode', error);
      // No hacer process.exit(1) para permitir que healthz funcione
    }
  }

  /**
   * Configura todos los middlewares de la aplicación
   */
  private initializeMiddlewares(): void {
    this.logger.info('Initializing middlewares...');

    // Configurar trust proxy de forma segura.
    // Evita usar 'true' (confía en toda la cadena) porque permite que un cliente falsifique X-Forwarded-For y evada el rate limiting.
    // Referencia: express-rate-limit ERR_ERL_PERMISSIVE_TRUST_PROXY
    // Se puede controlar via env TRUST_PROXY_SETTING. Valores aceptados: número de hops, 'false', listado de IPs o subnets.
    const trustProxySetting = process.env.TRUST_PROXY_SETTING || '1';
    if (trustProxySetting === 'false' || trustProxySetting === '0') {
      this.app.set('trust proxy', false);
    } else if (/^\d+$/.test(trustProxySetting)) {
      this.app.set('trust proxy', parseInt(trustProxySetting, 10));
    } else {
      // Permite formatos como 'loopback, linklocal, uniquelocal' o lista de subnets
      this.app.set('trust proxy', trustProxySetting);
    }

    // Configuración de CORS
    const corsOptions = {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:8100').split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID', 'X-Webhook-Secret']
    };

    // Middlewares de seguridad y utilidad
    this.app.use(helmet({
      contentSecurityPolicy: false, // Deshabilitado para APIs
      crossOriginEmbedderPolicy: false
    }));
    this.app.use(cors(corsOptions));
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // límite de requests por ventana
      message: {
        success: false,
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Generador de clave robusto: usa req.ip ya normalizado por trust proxy seguro
      keyGenerator: (req) => {
        // fallback a remoteAddress si por alguna razón ip no está
        return req.ip || (req.connection as any)?.remoteAddress || 'unknown';
      },
      // Excluir health checks del rate limiting
      skip: (req) => req.path === '/health' || req.path === '/webhook/health'
    });

    this.app.use(limiter);

    // Middlewares personalizados
    this.app.use(ErrorMiddleware.securityHeaders);
    this.app.use(ErrorMiddleware.requestLogger);

    this.logger.info('Middlewares initialized successfully');
  }

  /**
   * Configura todas las rutas de la aplicación
   */
  private initializeRoutes(): void {
    this.logger.info('Initializing routes...');

    // Ruta de bienvenida
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          service: 'WhatsApp Scheduler Backend',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          endpoints: {
            api: '/api/v1',
            webhooks: '/webhook',
            health: '/health',
            docs: '/docs'
          }
        },
        message: 'WhatsApp Scheduler Backend is running'
      });
    });

    // Rutas principales
    this.app.use('/api/v1', apiRoutes);
    this.app.use('/webhook', webhookRoutes);

    // Ruta de documentación básica
    this.app.get('/docs', (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          title: 'WhatsApp Scheduler Backend API Documentation',
          version: '1.0.0',
          description: 'Backend API for WhatsApp message scheduling with Wasender and Cronhooks integration',
          baseUrl: req.protocol + '://' + req.get('host'),
          authentication: {
            type: 'API Key',
            header: 'X-API-Key',
            description: 'All API endpoints require a valid API key'
          },
          endpoints: {
            messages: {
              send: 'POST /api/v1/messages/send',
              schedule: 'POST /api/v1/messages/schedule',
              list: 'GET /api/v1/messages/schedules',
              get: 'GET /api/v1/messages/schedules/:id',
              update: 'PUT /api/v1/messages/schedules/:id',
              delete: 'DELETE /api/v1/messages/schedules/:id',
              pause: 'POST /api/v1/messages/schedules/:id/pause',
              resume: 'POST /api/v1/messages/schedules/:id/resume',
              trigger: 'POST /api/v1/messages/schedules/:id/trigger'
            },
            wasender: {
              sessions: 'GET /api/v1/wasender/sessions',
              sessionInfo: 'GET /api/v1/wasender/sessions/:id',
              connect: 'POST /api/v1/wasender/sessions/:id/connect',
              status: 'GET /api/v1/wasender/connection-status',
              account: 'GET /api/v1/wasender/account'
            },
            webhooks: {
              trigger: 'POST /webhook/message-trigger',
              test: 'POST /webhook/test',
              info: 'GET /webhook/info'
            }
          },
          examples: {
            sendMessage: {
              url: 'POST /api/v1/messages/send',
              headers: { 'X-API-Key': 'your-api-key' },
              body: {
                phoneNumber: '+1234567890',
                messageType: 'text',
                message: 'Hello World!'
              }
            },
            scheduleMessage: {
              url: 'POST /api/v1/messages/schedule',
              headers: { 'X-API-Key': 'your-api-key' },
              body: {
                phoneNumber: '+1234567890',
                message: 'Scheduled message',
                contactName: 'John Doe',
                isRecurring: false,
                scheduledDateTime: '2024-01-01T12:00:00Z'
              }
            }
          }
        },
        message: 'API Documentation'
      });
    });

    this.logger.info('Routes initialized successfully');
  }

  /**
   * Configura el manejo de errores
   */
  private initializeErrorHandling(): void {
    this.logger.info('Initializing error handling...');

    // Middleware para rutas no encontradas
    this.app.use(ErrorMiddleware.notFoundHandler);

    // Middleware global de manejo de errores
    this.app.use(ErrorMiddleware.handleError);

    this.logger.info('Error handling initialized successfully');
  }

  /**
   * Configura los health checks y rutas de monitoreo
   */
  private initializeHealthChecks(): void {
    this.logger.info('Initializing health checks...');

    // Health check principal
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        const startTime = Date.now();

        // Verificar servicios externos
        const [wasenderHealthy, cronhooksHealthy] = await Promise.allSettled([
          this.wasenderService?.validateConfiguration(),
          this.cronhooksService?.validateConfiguration()
        ]);

        const responseTime = Date.now() - startTime;

        const healthData = {
          service: 'whatsapp-scheduler-backend',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          responseTime: `${responseTime}ms`,
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            wasender: {
              status: wasenderHealthy.status === 'fulfilled' && wasenderHealthy.value ? 'healthy' : 'unhealthy',
              details: wasenderHealthy.status === 'rejected' ? wasenderHealthy.reason?.message : 'OK'
            },
            cronhooks: {
              status: cronhooksHealthy.status === 'fulfilled' && cronhooksHealthy.value ? 'healthy' : 'unhealthy',
              details: cronhooksHealthy.status === 'rejected' ? cronhooksHealthy.reason?.message : 'OK'
            }
          },
          system: {
            nodejs: process.version,
            platform: process.platform,
            memory: {
              used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
              total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            },
            cpu: process.cpuUsage()
          }
        };

        // Determinar el status general
        const allServicesHealthy = healthData.services.wasender.status === 'healthy' &&
                                   healthData.services.cronhooks.status === 'healthy';

        // Siempre 200 para evitar reinicios por healthcheck externo; reportar estado degrade
        healthData.status = allServicesHealthy ? 'healthy' : 'degraded';

        res.status(200).json({
          success: allServicesHealthy,
          data: healthData,
          message: allServicesHealthy ? 'All systems operational' : 'Some services are unhealthy (degraded)'
        });

      } catch (error) {
        this.logger.error('Health check failed', error);

        res.status(503).json({
          success: false,
          data: {
            service: 'whatsapp-scheduler-backend',
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
          },
          message: 'Health check failed'
        });
      }
    });

    // /healthz ya está configurado en initializeBasicHealthCheck()

    // Endpoint de métricas básicas
    this.app.get('/metrics', AuthMiddleware.optionalAuthenticate, (req: Request, res: Response) => {
      try {
        const metrics = {
          service: 'whatsapp-scheduler-backend',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          auth: AuthMiddleware.getStats(),
          errors: ErrorMiddleware.getErrorStats(),
          environment: {
            nodeVersion: process.version,
            platform: process.platform,
            nodeEnv: process.env.NODE_ENV
          }
        };

        res.json({
          success: true,
          data: metrics,
          message: 'Service metrics'
        });

      } catch (error) {
        this.logger.error('Failed to generate metrics', error);
        res.status(500).json({
          success: false,
          error: 'Failed to generate metrics'
        });
      }
    });

    this.logger.info('Health checks initialized successfully');
  }

  /**
   * Validación inicial de la configuración
   */
  public async validateConfiguration(): Promise<boolean> {
    this.logger.info('Validating configuration...');

    const requiredEnvVars = [
      'WASENDER_API_TOKEN',
      'CRONHOOKS_API_TOKEN'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      this.logger.error('Missing required environment variables', {
        missing: missingVars
      });
      return false;
    }

    try {
      // Validar conectividad con servicios externos
      const wasenderValid = await this.wasenderService?.validateConfiguration();
      const cronhooksValid = await this.cronhooksService?.validateConfiguration();

      if (!wasenderValid) {
        this.logger.warn('Wasender service configuration is invalid');
      }

      if (!cronhooksValid) {
        this.logger.warn('Cronhooks service configuration is invalid');
      }

      this.logger.info('Configuration validation completed', {
        wasenderValid,
        cronhooksValid,
        overallValid: wasenderValid && cronhooksValid
      });

      return wasenderValid && cronhooksValid;

    } catch (error) {
      this.logger.error('Configuration validation failed', error);
      return false;
    }
  }

  /**
   * Inicia el servidor
   */
  public async start(): Promise<void> {
    const port = parseInt(process.env.PORT || '3000');
    const fastStart = process.env.FAST_START === 'true';

    try {
      // Iniciar servidor primero para no bloquear healthchecks - escuchar en todas las interfaces
      this.app.listen(port, '0.0.0.0', () => {
        this.logger.info(`Server listening (initializing configuration validation${fastStart ? ' - FAST_START enabled' : ''})`, {
          port,
          environment: process.env.NODE_ENV || 'development'
        });

        const baseUrl = process.env.WEBHOOK_BASE_URL || `http://localhost:${port}`;
        this.logger.info('Important URLs:', {
          healthz: `${baseUrl}/healthz`,
            health: `${baseUrl}/health`,
          docs: `${baseUrl}/docs`,
          webhook: `${baseUrl}/webhook/message-trigger`,
          api: `${baseUrl}/api/v1`
        });
      });

      if (fastStart) {
        this.logger.warn('FAST_START active: skipping pre-listen configuration validation');
        // Validar en background igualmente para logging
        this.backgroundValidate();
      } else {
        // Validar en background (no bloquear listen)
        this.backgroundValidate();
      }

    } catch (error) {
      this.logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  private async backgroundValidate(): Promise<void> {
    try {
      const startedAt = Date.now();
      const valid = await this.validateConfiguration();
      const duration = Date.now() - startedAt;
      if (!valid) {
        this.logger.warn('Configuration validation completed: degraded/unavailable services', { durationMs: duration });
      } else {
        this.logger.info('Configuration validation successful', { durationMs: duration });
      }
    } catch (err) {
      this.logger.error('Background validation failed', err);
    }
  }

  /**
   * Manejo de cierre graceful
   */
  public setupGracefulShutdown(): void {
    const shutdown = (signal: string) => {
      this.logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Aquí se pueden agregar tareas de limpieza
      // Por ejemplo: cerrar conexiones de base de datos, cancelar jobs, etc.

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Crear y exportar la instancia de la aplicación
const app = new App();

// Configurar manejo de cierre graceful
app.setupGracefulShutdown();

// Iniciar el servidor si este archivo se ejecuta directamente
if (require.main === module) {
  app.start().catch((error) => {
    console.error('==========================================');
    console.error('CRITICAL ERROR - Failed to start application:');
    console.error(error);
    console.error('==========================================');
    defaultLogger.error('Failed to start application', error);
    // No hacer process.exit para permitir debugging en Railway
    setTimeout(() => process.exit(1), 5000); // Esperar 5 segundos para logs
  });
}

export default app.app;