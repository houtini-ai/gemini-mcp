import * as winston from 'winston';
import { config } from '../config/index.js';

const transports: winston.transport[] = [
  new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }),
  new winston.transports.File({ 
    filename: 'logs/combined.log' 
  })
];

// Only add console logging if not running as MCP server (stdout must be clean)
if (process.env.NODE_ENV === 'development' || process.env.DEBUG_MCP === 'true') {
  transports.push(new winston.transports.Console());
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
