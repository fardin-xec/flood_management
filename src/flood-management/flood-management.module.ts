import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FloodManagementService } from './flood-management.service';
import { FloodManagementCron } from './flood-management.cron';
import { UnifierWrapperService } from '../core/service/unifier-wrapper.service';
import { FloodManagementController } from './flood-management.controller';

@Module({
  imports: [ConfigModule],
  providers: [
    UnifierWrapperService,
    FloodManagementService,
    FloodManagementCron,
  ],
  controllers : [FloodManagementController],
  exports: [FloodManagementService],
})
export class FloodManagementModule {}