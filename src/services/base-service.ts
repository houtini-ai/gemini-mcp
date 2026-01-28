import logger from '../utils/logger.js';

export abstract class BaseService {
  protected logger = logger;

  protected async handleError(error: Error, context?: string): Promise<never> {
    const contextMessage = context ? `[${context}] ` : '';
    const message = `${contextMessage}${error.message}`;
    
    this.logger.error(message, { 
      error: error.stack,
      context 
    });
    
    throw error;
  }

  protected logInfo(message: string, metadata?: any): void {
    this.logger.info(message, metadata);
  }

  protected logWarning(message: string, metadata?: any): void {
    this.logger.warn(message, metadata);
  }

  protected logError(message: string, error?: Error): void {
    this.logger.error(message, { error: error?.stack });
  }
}
