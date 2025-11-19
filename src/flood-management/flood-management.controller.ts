import { Controller, Get, Query } from '@nestjs/common';
import { FloodManagementCron } from './flood-management.cron';

@Controller('flood-management')
export class FloodManagementController {
  constructor(private floodManagementCron: FloodManagementCron) {}

  @Get('trigger')
  async triggerManual(@Query('retry') retry?: string) {
    const isRetry = retry === 'true';
    await this.floodManagementCron.triggerManualRun(isRetry);
    return {
      message: `Flood management process triggered (Retry: ${isRetry})`,
      timestamp: new Date().toISOString()
    };
  }
}