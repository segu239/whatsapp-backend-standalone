import winston from 'winston';
import path from 'path';

// Configuración de niveles de logging personalizados
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para los logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Formato para archivos (sin colores)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuración de transports
const transports: winston.transport[] = [
  // Console transport para desarrollo
  new winston.transports.Console({
    format: format,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  }),
];

// En producción, agregar file transport
if (process.env.NODE_ENV === 'production') {
  // Crear directorio de logs si no existe
  const logDir = path.join(process.cwd(), 'logs');

  transports.push(
    // Log de errores
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Log general
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Crear instancia del logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: fileFormat,
  transports,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(process.cwd(), 'logs', 'exceptions.log') })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(process.cwd(), 'logs', 'rejections.log') })
  ]
});

// Wrapper para facilitar el logging con contexto
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string, data?: any): string {
    const contextualMessage = `[${this.context}] ${message}`;
    return data ? `${contextualMessage} - ${JSON.stringify(data, null, 2)}` : contextualMessage;
  }

  error(message: string, data?: any, stack?: string): void {
    const formattedMessage = this.formatMessage(message, data);
    if (stack) {
      logger.error(`${formattedMessage}\nStack: ${stack}`);
    } else {
      logger.error(formattedMessage);
    }
  }

  warn(message: string, data?: any): void {
    logger.warn(this.formatMessage(message, data));
  }

  info(message: string, data?: any): void {
    logger.info(this.formatMessage(message, data));
  }

  http(message: string, data?: any): void {
    logger.http(this.formatMessage(message, data));
  }

  debug(message: string, data?: any): void {
    logger.debug(this.formatMessage(message, data));
  }

  // Métodos específicos para operaciones comunes
  apiRequest(method: string, url: string, duration?: number, status?: number): void {
    this.http(`${method} ${url}`, {
      duration: duration ? `${duration}ms` : undefined,
      status,
      timestamp: new Date().toISOString()
    });
  }

  apiError(method: string, url: string, error: any, duration?: number): void {
    this.error(`${method} ${url} failed`, {
      error: error.message || error,
      duration: duration ? `${duration}ms` : undefined,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  webhookReceived(webhookType: string, payload?: any): void {
    this.info(`Webhook received: ${webhookType}`, {
      payload: payload ? JSON.stringify(payload) : undefined,
      timestamp: new Date().toISOString()
    });
  }

  serviceOperation(operation: string, result: 'success' | 'error', details?: any): void {
    const level = result === 'success' ? 'info' : 'error';
    const message = `Service operation: ${operation} - ${result}`;

    if (level === 'error') {
      this.error(message, details);
    } else {
      this.info(message, details);
    }
  }

  retryAttempt(operation: string, attempt: number, maxRetries: number, error?: any): void {
    this.warn(`Retry attempt ${attempt}/${maxRetries} for operation: ${operation}`, {
      error: error?.message,
      timestamp: new Date().toISOString()
    });
  }
}

// Factory function para crear loggers con contexto
export const createLogger = (context: string): Logger => new Logger(context);

// Logger por defecto
export const defaultLogger = new Logger('App');

export default logger;