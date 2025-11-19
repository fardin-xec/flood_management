import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';
import { FloodManagementModule } from './flood-management/flood-management.module';

// Configure log directory path
const logDir = path.join(process.cwd(), 'logs');

// Ensure logs directory exists with proper error handling
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`Created logs directory at: ${logDir}`);
  } else {
    console.log(`Logs directory exists at: ${logDir}`);
  }
  
  // Test write permissions
  const testFile = path.join(logDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log(`Logs directory is writable: ${logDir}`);
} catch (error) {
  console.error(`Failed to create/access logs directory at ${logDir}:`, error);
  console.error('Falling back to console-only logging');
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env', // Explicit path
      ignoreEnvFile: false,
    }),
    ScheduleModule.forRoot(),
    WinstonModule.forRoot({
      transports: [
        // Console transport for development and Task Scheduler history
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context || 'Application'}] ${level}: ${message}`;
            }),
          ),
        }),
        // App log file - all logs
        new winston.transports.File({
          dirname: logDir,
          filename: 'app.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Error log file - errors only
        new winston.transports.File({
          dirname: logDir,
          filename: 'error.log',
          level: 'error',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        // Flood management specific log
        new winston.transports.File({
          dirname: logDir,
          filename: 'flood-management.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
      exitOnError: false,
    }),
    FloodManagementModule,
  ],
})
export class AppModule {}