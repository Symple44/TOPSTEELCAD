/**
 * Logger - Système de logs structurés pour TopSteelCAD
 * Remplace les console.log par un système centralisé et configurable
 */

/**
 * Niveaux de log
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

/**
 * Context de log pour identifier la source
 */
export interface LogContext {
  module?: string;
  component?: string;
  method?: string;
  [key: string]: any;
}

/**
 * Entry de log structurée
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: LogContext;
  data?: any;
  error?: Error;
}

/**
 * Transport pour envoyer les logs
 */
export interface LogTransport {
  log(entry: LogEntry): void;
  flush?(): Promise<void>;
}

/**
 * Transport console par défaut
 */
class ConsoleTransport implements LogTransport {
  private colors = {
    [LogLevel.ERROR]: '\x1b[31m', // Rouge
    [LogLevel.WARN]: '\x1b[33m',  // Jaune
    [LogLevel.INFO]: '\x1b[36m',  // Cyan
    [LogLevel.DEBUG]: '\x1b[90m', // Gris
    [LogLevel.TRACE]: '\x1b[37m'  // Blanc
  };
  
  private reset = '\x1b[0m';
  
  log(entry: LogEntry): void {
    const level = LogLevel[entry.level];
    const color = this.colors[entry.level];
    const prefix = `${color}[${level}]${this.reset}`;
    const timestamp = entry.timestamp.toISOString();
    
    let message = `${prefix} ${timestamp}`;
    
    if (entry.context?.module) {
      message += ` [${entry.context.module}]`;
    }
    
    message += ` ${entry.message}`;
    
    // Choisir la méthode console appropriée
    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        if (entry.error) {
          console.error(entry.error);
        }
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.TRACE:
        console.trace(message, entry.data || '');
        break;
    }
  }
}

/**
 * Transport de stockage en mémoire (pour debug/tests)
 */
export class MemoryTransport implements LogTransport {
  private entries: LogEntry[] = [];
  private maxEntries: number;
  
  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }
  
  log(entry: LogEntry): void {
    this.entries.push(entry);
    
    // Limiter la taille
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }
  
  getEntries(): LogEntry[] {
    return [...this.entries];
  }
  
  clear(): void {
    this.entries = [];
  }
  
  /**
   * Exporte les logs dans un format lisible
   */
  export(): string {
    return this.entries.map(entry => {
      const level = LogLevel[entry.level].padEnd(5);
      const time = entry.timestamp.toISOString();
      const module = entry.context?.module || 'APP';
      let line = `[${time}] [${level}] [${module}] ${entry.message}`;
      if (entry.data) {
        line += '\n  DATA: ' + JSON.stringify(entry.data, null, 2).replace(/\n/g, '\n  ');
      }
      if (entry.error) {
        line += '\n  ERROR: ' + entry.error.stack;
      }
      return line;
    }).join('\n');
  }
  
  /**
   * Télécharge les logs
   */
  download(): void {
    const content = this.export();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `topsteelcad-logs-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Configuration du logger
 */
export interface LoggerConfig {
  level: LogLevel;
  transports: LogTransport[];
  enabled: boolean;
  context?: LogContext;
}

/**
 * Logger principal
 */
export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private transports: LogTransport[] = [];
  
  private constructor() {
    // Configuration par défaut
    this.config = {
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      transports: [new ConsoleTransport()],
      enabled: true
    };
    
    this.transports = this.config.transports;
  }
  
  /**
   * Obtient l'instance singleton
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Méthodes statiques pour utilisation directe
   */
  static error(message: string, error?: Error, data?: any, context?: LogContext): void {
    Logger.getInstance().error(message, error, data, context);
  }
  
  static warn(message: string, data?: any, context?: LogContext): void {
    Logger.getInstance().warn(message, data, context);
  }
  
  static info(message: string, data?: any, context?: LogContext): void {
    Logger.getInstance().info(message, data, context);
  }
  
  static debug(message: string, data?: any, context?: LogContext): void {
    Logger.getInstance().debug(message, data, context);
  }
  
  static trace(message: string, data?: any, context?: LogContext): void {
    Logger.getInstance().trace(message, data, context);
  }
  
  /**
   * Configure le logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.transports) {
      this.transports = config.transports;
    }
  }
  
  /**
   * Crée un logger enfant avec contexte
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }
  
  /**
   * Méthodes de log principales
   */
  error(message: string, error?: Error, data?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, data, context, error);
  }
  
  warn(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.WARN, message, data, context);
  }
  
  info(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.INFO, message, data, context);
  }
  
  debug(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }
  
  trace(message: string, data?: any, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, data, context);
  }
  
  /**
   * Log générique
   */
  log(level: LogLevel, message: string, data?: any, context?: LogContext, error?: Error): void {
    // Vérifier si le log est activé et le niveau
    if (!this.config.enabled || level > this.config.level) {
      return;
    }
    
    // Créer l'entrée
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: { ...this.config.context, ...context },
      data,
      error
    };
    
    // Envoyer aux transports
    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (err) {
        // Fallback sur console si transport échoue
        console.error('Logger transport error:', err);
      }
    });
  }
  
  /**
   * Ajoute un transport
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }
  
  /**
   * Retire un transport
   */
  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }
  
  /**
   * Flush tous les transports
   */
  async flush(): Promise<void> {
    const promises = this.transports
      .filter(t => t.flush)
      .map(t => t.flush!());
    
    await Promise.all(promises);
  }
  
  /**
   * Active/désactive le logger
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
  
  /**
   * Change le niveau de log
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
  
  /**
   * Obtient le niveau actuel
   */
  getLevel(): LogLevel {
    return this.config.level;
  }
}

/**
 * Logger enfant avec contexte
 */
export class ChildLogger {
  constructor(
    private parent: Logger,
    private context: LogContext
  ) {}
  
  error(message: string, error?: Error, data?: any): void {
    this.parent.error(message, error, data, this.context);
  }
  
  warn(message: string, data?: any): void {
    this.parent.warn(message, data, this.context);
  }
  
  info(message: string, data?: any): void {
    this.parent.info(message, data, this.context);
  }
  
  debug(message: string, data?: any): void {
    this.parent.debug(message, data, this.context);
  }
  
  trace(message: string, data?: any): void {
    this.parent.trace(message, data, this.context);
  }
  
  /**
   * Crée un sous-logger avec contexte additionnel
   */
  child(additionalContext: LogContext): ChildLogger {
    return new ChildLogger(this.parent, {
      ...this.context,
      ...additionalContext
    });
  }
}

/**
 * Instance globale par défaut
 */
export const logger = Logger.getInstance();

/**
 * Transport mémoire global pour debug
 */
export const memoryTransport = new MemoryTransport(5000);

// Configuration en mode développement
console.log('🔧 Initialisation du logger...');

// Toujours exposer le logger, pas seulement en DEV
logger.configure({
  level: LogLevel.TRACE,
  transports: [memoryTransport], // Seulement en mémoire
  enabled: true
});

// Exposer globalement pour debug (seulement dans le navigateur)
if (typeof window !== 'undefined') {
  (window as unknown).topsteelLogger = {
    logger,
    memory: memoryTransport,
    download: () => memoryTransport.download(),
    show: () => console.log(memoryTransport.export()),
    clear: () => memoryTransport.clear(),
    enableConsole: (enable: boolean) => {
      if (enable) {
        logger.addTransport(new ConsoleTransport());
      } else {
        logger.configure({ transports: [memoryTransport] });
      }
    }
  };

  console.log('✅ Logger configuré. Utilisez window.topsteelLogger pour accéder aux logs.');
  console.log('  - .download() pour télécharger les logs');
  console.log('  - .show() pour afficher les logs');
  console.log('  - .clear() pour vider les logs');
  console.log('  - .enableConsole(true) pour activer la sortie console');
}

/**
 * Helpers pour créer des loggers spécialisés
 */
export function createModuleLogger(module: string): ChildLogger {
  return logger.child({ module });
}

export function createComponentLogger(component: string): ChildLogger {
  return logger.child({ component });
}

/**
 * Transport pour fichier (Node.js uniquement)
 */
export class FileTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private bufferSize: number = 100;
  private filePath: string;
  
  constructor(filePath: string, bufferSize: number = 100) {
    this.filePath = filePath;
    this.bufferSize = bufferSize;
  }
  
  log(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }
  
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    // En environnement browser, stocker dans localStorage
    if (typeof window !== 'undefined') {
      const existing = localStorage.getItem('topsteelcad_logs') || '[]';
      const logs = JSON.parse(existing);
      logs.push(...this.buffer);
      
      // Limiter la taille
      if (logs.length > 10000) {
        logs.splice(0, logs.length - 10000);
      }
      
      localStorage.setItem('topsteelcad_logs', JSON.stringify(logs));
    }
    
    this.buffer = [];
  }
}

/**
 * Décorateur pour logger les méthodes
 */
export function LogMethod(level: LogLevel = LogLevel.DEBUG) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: unknown[]) {
      const className = target.constructor.name;
      const log = createComponentLogger(className);
      
      switch(level) {
        case LogLevel.ERROR: log.error(`${propertyName} called`, undefined, { args }); break;
        case LogLevel.WARN: log.warn(`${propertyName} called`, { args }); break;
        case LogLevel.INFO: log.info(`${propertyName} called`, { args }); break;
        case LogLevel.DEBUG: log.debug(`${propertyName} called`, { args }); break;
        default: log.debug(`${propertyName} called`, { args });
      }
      
      try {
        const result = method.apply(this, args);
        
        if (result instanceof Promise) {
          return result
            .then(res => {
              switch(level) {
                case LogLevel.ERROR: log.error(`${propertyName} completed`, undefined, { result: res }); break;
                case LogLevel.WARN: log.warn(`${propertyName} completed`, { result: res }); break;
                case LogLevel.INFO: log.info(`${propertyName} completed`, { result: res }); break;
                case LogLevel.DEBUG: log.debug(`${propertyName} completed`, { result: res }); break;
                default: log.debug(`${propertyName} completed`, { result: res });
              }
              return res;
            })
            .catch(err => {
              log.error(`${propertyName} failed`, err);
              throw err;
            });
        }
        
        switch(level) {
          case LogLevel.ERROR: log.error(`${propertyName} completed`, undefined, { result }); break;
          case LogLevel.WARN: log.warn(`${propertyName} completed`, { result }); break;
          case LogLevel.INFO: log.info(`${propertyName} completed`, { result }); break;
          case LogLevel.DEBUG: log.debug(`${propertyName} completed`, { result }); break;
          default: log.debug(`${propertyName} completed`, { result });
        }
        return result;
      } catch (error) {
        log.error(`${propertyName} failed`, error as Error);
        throw error;
      }
    };
  };
}

/**
 * Mesure et log la performance
 */
export function LogPerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;
  
  descriptor.value = function (...args: unknown[]) {
    const className = target.constructor.name;
    const log = createComponentLogger(className);
    const start = performance.now();
    
    const result = method.apply(this, args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        log.debug(`${propertyName} took ${duration.toFixed(2)}ms`);
      });
    }
    
    const duration = performance.now() - start;
    log.debug(`${propertyName} took ${duration.toFixed(2)}ms`);
    
    return result;
  };
}