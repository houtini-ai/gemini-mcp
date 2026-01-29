import * as winston from 'winston';
import { config } from '../config/index.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Determine if we should use file logging
// Only enable file logging if explicitly requested via environment variable
const shouldUseFileLogging = process.env.GEMINI_MCP_LOG_FILE === 'true';

const transports: winston.transport[] = [];

// File logging (optional, disabled by default for MCP stdio servers)
if (shouldUseFileLogging) {
  // Use user home directory for cross-platform compatibility
  // ~/.gemini-mcp/logs/ on Unix-like systems
  // C:\Users\username\.gemini-mcp\logs\ on Windows
  const logDir = path.join(os.homedir(), '.gemini-mcp', 'logs');
  
  try {
    // Ensure log directory exists
    fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
    
    transports.push(
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  } catch (error) {
    // Fallback to console only if directory creation fails
    process.stderr.write(`Warning: Could not create log directory at ${logDir}. File logging disabled.\n`);
  }
}

// Console logging (stderr to avoid polluting stdout for MCP)
// Only add if in development mode or DEBUG_MCP is enabled
if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MCP === 'true') {
  transports.push(
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'], // All levels to stderr
    })
  );
}

// Fallback: If no transports configured, add a minimal Console transport to stderr
// This ensures errors are visible even when file logging fails
if (transports.length === 0) {
  transports.push(
    new winston.transports.Console({
      level: 'error',
      stderrLevels: ['error', 'warn', 'info', 'debug'],
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${message}${stack ? '\n' + stack : ''}`;
    })
  ),
  transports
});

export default logger;
