import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: any;
}

export class Logger {
  private logStream: fs.WriteStream | null = null;
  private minLevel: LogLevel;

  constructor(logPath?: string, minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;

    if (logPath) {
      const dir = path.dirname(logPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.logStream = fs.createWriteStream(logPath, { flags: 'a' });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
    }[level];

    return `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  private write(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const formatted = this.formatMessage(entry.level, entry.message);
    console.log(formatted);

    if (this.logStream) {
      this.logStream.write(JSON.stringify(entry) + '\n');
    }
  }

  info(message: string, metadata?: any): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      metadata,
    });
  }

  warn(message: string, metadata?: any): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      metadata,
    });
  }

  error(message: string, metadata?: any): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      metadata,
    });
  }

  debug(message: string, metadata?: any): void {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      metadata,
    });
  }

  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const logger = new Logger(
  process.env.LOG_FILE,
  (process.env.LOG_LEVEL as LogLevel) || 'info'
);
