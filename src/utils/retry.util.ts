import { createLogger } from './logger';
import { RetryConfig } from '../interfaces/cronhooks.interface';

const logger = createLogger('RetryUtil');

export interface RetryOptions extends RetryConfig {
  operation: () => Promise<any>;
  operationName: string;
  shouldRetry?: (error: any) => boolean;
}

export class RetryUtil {
  private static defaultConfig: RetryConfig = {
    maxRetries: parseInt(process.env.DEFAULT_MAX_RETRIES || '3'),
    baseDelayMs: parseInt(process.env.DEFAULT_RETRY_DELAY_MS || '1000'),
    maxDelayMs: parseInt(process.env.DEFAULT_MAX_DELAY_MS || '30000'),
    backoffMultiplier: 2,
    jitterEnabled: true
  };

  /**
   * Ejecuta una operación con retry logic y exponential backoff
   */
  static async executeWithRetry<T>(options: RetryOptions): Promise<T> {
    const config = { ...this.defaultConfig, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        const result = await options.operation();

        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt - 1} retries`, {
            operation: options.operationName,
            totalAttempts: attempt
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        // Si es el último intento, lanzar el error
        if (attempt > config.maxRetries) {
          logger.error(`Operation failed after ${config.maxRetries} retries`, {
            operation: options.operationName,
            error: error.message,
            totalAttempts: attempt
          });
          throw error;
        }

        // Verificar si el error debe ser reintentado
        if (options.shouldRetry && !options.shouldRetry(error)) {
          logger.warn(`Operation failed with non-retryable error`, {
            operation: options.operationName,
            error: error.message,
            attempt
          });
          throw error;
        }

        // Calcular delay para el siguiente intento
        const delay = this.calculateDelay(attempt, config);

        logger.retryAttempt(options.operationName, attempt, config.maxRetries, error);
        logger.debug(`Waiting ${delay}ms before retry`, { operation: options.operationName });

        // Esperar antes del siguiente intento
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Calcula el delay para el siguiente intento con exponential backoff
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);

    // Aplicar límite máximo
    delay = Math.min(delay, config.maxDelayMs);

    // Agregar jitter si está habilitado
    if (config.jitterEnabled) {
      const jitter = delay * 0.1 * Math.random();
      delay += jitter;
    }

    return Math.floor(delay);
  }

  /**
   * Determina si un error HTTP debe ser reintentado
   */
  static shouldRetryHttpError(error: any): boolean {
    // Errores de red siempre se reintentan
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return true;
    }

    // Si no hay status, probablemente es un error de red
    if (!error.response?.status) {
      return true;
    }

    const status = error.response.status;

    // Errores 5xx (servidor) se reintentan
    if (status >= 500) {
      return true;
    }

    // Rate limiting (429) se reintenta
    if (status === 429) {
      return true;
    }

    // Timeouts se reintentan
    if (status === 408) {
      return true;
    }

    // Errores 4xx (cliente) generalmente NO se reintentan
    // excepto algunos casos específicos
    if (status >= 400 && status < 500) {
      // Estos errores de cliente NO se reintentan
      const nonRetryableStatuses = [400, 401, 403, 404, 422];
      return !nonRetryableStatuses.includes(status);
    }

    // Cualquier otro error se reintenta
    return true;
  }

  /**
   * Determina si un error de Cronhooks debe ser reintentado
   */
  static shouldRetryCronhooksError(error: any): boolean {
    // Usar la lógica HTTP general como base
    if (!this.shouldRetryHttpError(error)) {
      return false;
    }

    // Verificaciones específicas de Cronhooks
    const errorMessage = error.message?.toLowerCase() || '';

    // Errores específicos que no deben reintentarse
    const nonRetryableMessages = [
      'invalid api key',
      'unauthorized',
      'forbidden',
      'invalid schedule format',
      'invalid cron expression'
    ];

    return !nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Determina si un error de Wasender debe ser reintentado
   */
  static shouldRetryWasenderError(error: any): boolean {
    // Usar la lógica HTTP general como base
    if (!this.shouldRetryHttpError(error)) {
      return false;
    }

    // Verificaciones específicas de Wasender
    const errorMessage = error.message?.toLowerCase() || '';

    // Errores específicos que no deben reintentarse
    const nonRetryableMessages = [
      'invalid token',
      'unauthorized',
      'forbidden',
      'invalid phone number',
      'session not found',
      'session not connected'
    ];

    return !nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Wrapper para operaciones de Cronhooks con retry específico
   */
  static async executeCronhooksOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const fullConfig = { ...this.defaultConfig, ...customConfig };
    return this.executeWithRetry({
      operation,
      operationName: `Cronhooks.${operationName}`,
      shouldRetry: this.shouldRetryCronhooksError,
      ...fullConfig
    });
  }

  /**
   * Wrapper para operaciones de Wasender con retry específico
   */
  static async executeWasenderOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const fullConfig = { ...this.defaultConfig, ...customConfig };
    return this.executeWithRetry({
      operation,
      operationName: `Wasender.${operationName}`,
      shouldRetry: this.shouldRetryWasenderError,
      ...fullConfig
    });
  }

  /**
   * Utility para esperar un tiempo determinado
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Ejecuta múltiples operaciones con retry de forma concurrente
   */
  static async executeMultipleWithRetry<T>(
    operations: Array<{
      operation: () => Promise<T>;
      name: string;
      config?: Partial<RetryConfig>;
    }>
  ): Promise<T[]> {
    const promises = operations.map(op => {
      const fullConfig = { ...this.defaultConfig, ...op.config };
      return this.executeWithRetry({
        operation: op.operation,
        operationName: op.name,
        ...fullConfig
      });
    });

    return Promise.all(promises) as Promise<T[]>;
  }

  /**
   * Obtiene la configuración por defecto
   */
  static getDefaultConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Actualiza la configuración por defecto
   */
  static setDefaultConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }
}

export default RetryUtil;