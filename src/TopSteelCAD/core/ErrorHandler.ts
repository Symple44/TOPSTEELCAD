/**
 * ErrorHandler - Gestion centralisée des erreurs
 * Capture, log et traite les erreurs de manière cohérente
 */

import { Logger } from '../utils/Logger';

/**
 * Types d'erreurs personnalisées
 */
export enum ErrorType {
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  RENDERING_ERROR = 'RENDERING_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DSTV_ERROR = 'DSTV_ERROR',
  GEOMETRY_ERROR = 'GEOMETRY_ERROR',
  FEATURE_ERROR = 'FEATURE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Codes d'erreur spécifiques DSTV
 */
export enum DSTVErrorCode {
  // Structure errors
  MISSING_ST_BLOCK = 'DSTV_001',
  MISSING_EN_BLOCK = 'DSTV_002',
  INVALID_BLOCK_SEQUENCE = 'DSTV_003',
  UNMATCHED_BLOCKS = 'DSTV_004',
  
  // Data errors
  INVALID_PROFILE_TYPE = 'DSTV_010',
  INVALID_DIMENSIONS = 'DSTV_011',
  INVALID_STEEL_GRADE = 'DSTV_012',
  INVALID_HOLE_DATA = 'DSTV_013',
  INVALID_CUT_CONTOUR = 'DSTV_014',
  INVALID_MARKING_TEXT = 'DSTV_015',
  
  // Geometry errors
  OVERLAPPING_HOLES = 'DSTV_020',
  SELF_INTERSECTING_CONTOUR = 'DSTV_021',
  OUT_OF_BOUNDS_FEATURE = 'DSTV_022',
  INVALID_FACE_INDICATOR = 'DSTV_023',
  
  // Processing errors
  LEXER_ERROR = 'DSTV_030',
  PARSER_ERROR = 'DSTV_031',
  VALIDATOR_ERROR = 'DSTV_032',
  CONVERTER_ERROR = 'DSTV_033'
}

/**
 * Sévérité de l'erreur
 */
export enum ErrorSeverity {
  LOW = 'LOW',       // Peut continuer sans problème
  MEDIUM = 'MEDIUM', // Fonctionnalité dégradée
  HIGH = 'HIGH',     // Fonctionnalité bloquée
  CRITICAL = 'CRITICAL' // Application instable
}

/**
 * Contexte d'erreur
 */
export interface ErrorContext {
  module?: string;
  component?: string;
  method?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Erreur personnalisée avec métadonnées
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;
  public readonly id: string;
  
  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: ErrorContext,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date();
    this.id = this.generateErrorId();
    
    // Maintenir la stack trace
    if (originalError?.stack) {
      this.stack = originalError.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  toJSON(): object {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Handler d'erreur avec stratégies de récupération
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: AppError): boolean;
  recover(error: AppError): Promise<void>;
}

/**
 * Callback pour notification d'erreur
 */
export type ErrorCallback = (error: AppError) => void;

/**
 * Configuration du handler
 */
export interface ErrorHandlerConfig {
  logErrors: boolean;
  throwErrors: boolean;
  notifyUser: boolean;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Gestionnaire d'erreurs centralisé
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private log = Logger;
  private config: ErrorHandlerConfig;
  private callbacks: Set<ErrorCallback> = new Set();
  private recoveryStrategies: Map<ErrorType, ErrorRecoveryStrategy[]> = new Map();
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;
  
  private constructor() {
    this.config = {
      logErrors: true,
      throwErrors: false,
      notifyUser: true,
      maxRetries: 3,
      retryDelay: 1000
    };
    
    // Capturer les erreurs non gérées
    this.setupGlobalHandlers();
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }
  
  /**
   * Configure le handler
   */
  configure(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Gère une erreur
   */
  async handle(
    error: Error | AppError | string,
    type?: ErrorType,
    severity?: ErrorSeverity,
    context?: ErrorContext
  ): Promise<void> {
    // Normaliser l'erreur
    const appError = this.normalizeError(error, type, severity, context);
    
    // Ajouter à l'historique
    this.addToHistory(appError);
    
    // Logger l'erreur
    if (this.config.logErrors) {
      this.logError(appError);
    }
    
    // Notifier les callbacks
    this.notifyCallbacks(appError);
    
    // Essayer de récupérer
    const recovered = await this.tryRecover(appError);
    
    // Si non récupéré et configuré pour throw
    if (!recovered && this.config.throwErrors) {
      throw appError;
    }
    
    // Notifier l'utilisateur si nécessaire
    if (!recovered && this.config.notifyUser) {
      this.notifyUser(appError);
    }
  }
  
  /**
   * Wrapper pour exécution avec gestion d'erreur
   */
  async wrap<T>(
    fn: () => T | Promise<T>,
    type?: ErrorType,
    context?: ErrorContext
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      await this.handle(error as Error, type, ErrorSeverity.MEDIUM, context);
      return null;
    }
  }
  
  /**
   * Wrapper avec retry
   */
  async wrapWithRetry<T>(
    fn: () => T | Promise<T>,
    type?: ErrorType,
    context?: ErrorContext
  ): Promise<T | null> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < this.config.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (i < this.config.maxRetries - 1) {
          this.log.debug(`Retry ${i + 1}/${this.config.maxRetries} after error`, { error });
          await this.delay(this.config.retryDelay * Math.pow(2, i)); // Exponential backoff
        }
      }
    }
    
    if (lastError) {
      await this.handle(lastError, type, ErrorSeverity.HIGH, context);
    }
    
    return null;
  }
  
  /**
   * Enregistre un callback d'erreur
   */
  onError(callback: ErrorCallback): () => void {
    this.callbacks.add(callback);
    
    // Retourne une fonction de désinscription
    return () => {
      this.callbacks.delete(callback);
    };
  }
  
  /**
   * Enregistre une stratégie de récupération
   */
  registerRecoveryStrategy(type: ErrorType, strategy: ErrorRecoveryStrategy): void {
    if (!this.recoveryStrategies.has(type)) {
      this.recoveryStrategies.set(type, []);
    }
    
    this.recoveryStrategies.get(type)!.push(strategy);
  }
  
  /**
   * Obtient l'historique des erreurs
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }
  
  /**
   * Vide l'historique
   */
  clearHistory(): void {
    this.errorHistory = [];
  }
  
  /**
   * Obtient les statistiques d'erreurs
   */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    recent: number;
  } {
    const now = Date.now();
    const recentThreshold = 5 * 60 * 1000; // 5 minutes
    
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recent: 0
    };
    
    this.errorHistory.forEach(error => {
      // Par type
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      
      // Par sévérité
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      // Récentes
      if (now - error.timestamp.getTime() < recentThreshold) {
        stats.recent++;
      }
    });
    
    return stats;
  }
  
  /**
   * Normalise une erreur
   */
  private normalizeError(
    error: Error | AppError | string,
    type?: ErrorType,
    severity?: ErrorSeverity,
    context?: ErrorContext
  ): AppError {
    if (error instanceof AppError) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new AppError(
        error,
        type || ErrorType.UNKNOWN_ERROR,
        severity || ErrorSeverity.MEDIUM,
        context
      );
    }
    
    // Détection automatique du type basée sur le message
    const detectedType = this.detectErrorType(error);
    
    return new AppError(
      error.message,
      type || detectedType,
      severity || this.detectSeverity(detectedType),
      context,
      error
    );
  }
  
  /**
   * Détecte le type d'erreur
   */
  private detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('parse') || message.includes('syntax')) {
      return ErrorType.PARSING_ERROR;
    }
    if (message.includes('valid')) {
      return ErrorType.VALIDATION_ERROR;
    }
    if (message.includes('render') || message.includes('draw')) {
      return ErrorType.RENDERING_ERROR;
    }
    if (message.includes('file') || message.includes('read') || message.includes('write')) {
      return ErrorType.FILE_ERROR;
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorType.PERMISSION_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }
  
  /**
   * Détecte la sévérité
   */
  private detectSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.PARSING_ERROR:
      case ErrorType.VALIDATION_ERROR:
        return ErrorSeverity.MEDIUM;
      case ErrorType.RENDERING_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.PERMISSION_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.NETWORK_ERROR:
        return ErrorSeverity.LOW;
      default:
        return ErrorSeverity.MEDIUM;
    }
  }
  
  /**
   * Log l'erreur
   */
  private logError(error: AppError): void {
    const logMessage = `[${error.id}] ${error.message}`;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        this.log.error(logMessage, error.originalError || error, error.context);
        break;
      case ErrorSeverity.MEDIUM:
        this.log.warn(logMessage, error.context);
        break;
      case ErrorSeverity.LOW:
        this.log.info(logMessage, error.context);
        break;
    }
  }
  
  /**
   * Notifie les callbacks
   */
  private notifyCallbacks(error: AppError): void {
    this.callbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        this.log.error('Error in error callback', err as Error);
      }
    });
  }
  
  /**
   * Essaye de récupérer
   */
  private async tryRecover(error: AppError): Promise<boolean> {
    const strategies = this.recoveryStrategies.get(error.type);
    
    if (!strategies || strategies.length === 0) {
      return false;
    }
    
    for (const strategy of strategies) {
      if (strategy.canRecover(error)) {
        try {
          await strategy.recover(error);
          this.log.info(`Recovered from error ${error.id} using strategy`);
          return true;
        } catch (recoveryError) {
          this.log.error('Recovery strategy failed', recoveryError as Error);
        }
      }
    }
    
    return false;
  }
  
  /**
   * Notifie l'utilisateur
   */
  private notifyUser(error: AppError): void {
    // En environnement browser
    if (typeof window !== 'undefined') {
      const message = this.getUserMessage(error);
      
      // Utiliser une notification ou un toast si disponible
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Erreur', { body: message });
      } else {
        // Fallback sur console
        console.error(`🚨 ${message}`);
      }
    }
  }
  
  /**
   * Génère un message utilisateur
   */
  private getUserMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.PARSING_ERROR:
        return 'Le fichier n\'a pas pu être lu correctement.';
      case ErrorType.VALIDATION_ERROR:
        return 'Les données ne sont pas valides.';
      case ErrorType.RENDERING_ERROR:
        return 'Un problème d\'affichage est survenu.';
      case ErrorType.FILE_ERROR:
        return 'Impossible d\'accéder au fichier.';
      case ErrorType.NETWORK_ERROR:
        return 'Problème de connexion réseau.';
      case ErrorType.PERMISSION_ERROR:
        return 'Permission refusée.';
      default:
        return 'Une erreur inattendue s\'est produite.';
    }
  }
  
  /**
   * Ajoute à l'historique
   */
  private addToHistory(error: AppError): void {
    this.errorHistory.push(error);
    
    // Limiter la taille
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }
  
  /**
   * Configure les handlers globaux
   */
  private setupGlobalHandlers(): void {
    if (typeof window !== 'undefined') {
      // Browser environment
      window.addEventListener('error', (event) => {
        this.handle(
          new Error(event.message),
          ErrorType.UNKNOWN_ERROR,
          ErrorSeverity.HIGH,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        );
      });
      
      window.addEventListener('unhandledrejection', (event) => {
        this.handle(
          new Error(event.reason),
          ErrorType.UNKNOWN_ERROR,
          ErrorSeverity.HIGH,
          { promise: true }
        );
      });
    } else if (typeof process !== 'undefined') {
      // Node.js environment
      process.on('uncaughtException', (error) => {
        this.handle(error, ErrorType.UNKNOWN_ERROR, ErrorSeverity.CRITICAL);
      });
      
      process.on('unhandledRejection', (reason) => {
        this.handle(
          new Error(String(reason)),
          ErrorType.UNKNOWN_ERROR,
          ErrorSeverity.HIGH
        );
      });
    }
  }
  
  /**
   * Helper pour delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Instance globale
export const errorHandler = ErrorHandler.getInstance();

// Helpers pour création d'erreurs typées
export function createParsingError(message: string, context?: ErrorContext): AppError {
  return new AppError(message, ErrorType.PARSING_ERROR, ErrorSeverity.MEDIUM, context);
}

export function createValidationError(message: string, context?: ErrorContext): AppError {
  return new AppError(message, ErrorType.VALIDATION_ERROR, ErrorSeverity.MEDIUM, context);
}

export function createRenderingError(message: string, context?: ErrorContext): AppError {
  return new AppError(message, ErrorType.RENDERING_ERROR, ErrorSeverity.HIGH, context);
}

// Décorateur pour gestion automatique des erreurs
export function HandleError(type?: ErrorType, severity?: ErrorSeverity) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const context = {
        component: target.constructor.name,
        method: propertyName
      };
      
      try {
        return await method.apply(this, args);
      } catch (error) {
        await errorHandler.handle(error as Error, type, severity, context);
        return null;
      }
    };
  };
}