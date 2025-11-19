import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FloodManagementService } from './flood-management.service';
import { Const_Config } from '../shared/constants/cron.constants';

@Injectable()
export class FloodManagementCron {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private floodManagementService: FloodManagementService,
  ) {}

  // Run at midnight on September 1st every year
  @Cron(Const_Config.CRON_EXPRESSIONS.SEPT_1_ANNUALLY, {
    name: 'flood-management-initial',
    timeZone: process.env.CRON_TIMEZONE || 'Asia/Kolkata',
  })
  async handleInitialRun() {
    this.logger.info('🚀 Running initial flood management job (Sept 1)', {
      context: FloodManagementCron.name,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.floodManagementService.processFloodManagementProjects(false);
      this.logger.info('✅ Initial job completed successfully', {
        context: FloodManagementCron.name,
      });
    } catch (error) {
      this.logger.error('❌ Initial job failed', {
        context: FloodManagementCron.name,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // Run at midnight on September 2nd every year
  @Cron(Const_Config.CRON_EXPRESSIONS.SEPT_2_ANNUALLY, {
    name: 'flood-management-retry',
    timeZone: process.env.CRON_TIMEZONE || 'Asia/Kolkata',
  })
  async handleRetryRun() {
    this.logger.info('🔄 Running retry flood management job (Sept 2)', {
      context: FloodManagementCron.name,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.floodManagementService.processFloodManagementProjects(true);
      this.logger.info('✅ Retry job completed successfully', {
        context: FloodManagementCron.name,
      });
    } catch (error) {
      this.logger.error('❌ Retry job failed', {
        context: FloodManagementCron.name,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  // Manual trigger for testing
  async triggerManualRun(isRetry: boolean = false) {
    this.logger.info('🔧 Manual trigger initiated', {
      context: FloodManagementCron.name,
      isRetry,
      timestamp: new Date().toISOString(),
    });

    try {
      await this.floodManagementService.processFloodManagementProjects(isRetry);
      this.logger.info('✅ Manual trigger completed', {
        context: FloodManagementCron.name,
        isRetry,
      });
    } catch (error) {
      this.logger.error('❌ Manual trigger failed', {
        context: FloodManagementCron.name,
        isRetry,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}