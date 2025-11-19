import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UnifierWrapperService } from '../core/service/unifier-wrapper.service';
import { FileUtils } from '../shared/utils/file.utils';
import { Const_Config } from '../shared/constants/cron.constants';
import { FloodProjectDto, CreateRecordResult } from './dto/flood-project.dto';

@Injectable()
export class FloodManagementService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private unifierWrapper: UnifierWrapperService
  ) {}

  async processFloodManagementProjects(isRetry: boolean = false): Promise<void> {
    this.logger.info('Starting flood management process', {
      context: FloodManagementService.name,
      isRetry,
      timestamp: new Date().toISOString()
    });
    
    try {
      let projects: FloodProjectDto[];
      
      if (isRetry) {
        // Read failed records from file
        const failedRecords = await FileUtils.readFailedRecords(
          Const_Config.FLOOD_MANAGEMENT_CONFIG.FAILED_RECORDS_FILE
        );
        
        if (failedRecords.length === 0) {
          this.logger.info('No failed records to retry', {
            context: FloodManagementService.name
          });
          return;
        }
        
        this.logger.info(`Found ${failedRecords.length} failed records to retry`, {
          context: FloodManagementService.name,
          count: failedRecords.length
        });
        projects = failedRecords.map(r => ({ projectNumber: r.projectNumber }));
      } else {
        // Fetch all projects from UDR
        const udrData = await this.unifierWrapper.getUDRRecords(
          Const_Config.FLOOD_MANAGEMENT_CONFIG.UDR_NAME,
          { timeout: 30000 }
        );
        
        // Map UDR data to FloodProjectDto
        projects = this.mapUDRDataToProjects(udrData);
        this.logger.info(`Fetched ${projects.length} projects from UDR`, {
          context: FloodManagementService.name,
          count: projects.length
        });
      }

      if (projects.length === 0) {
        this.logger.warn('No projects found to process', {
          context: FloodManagementService.name
        });
        return;
      }

      const results = await this.createRecordsForProjects(projects);
      
      // Separate successful and failed results
      const failed = results.filter(r => !r.success);
      const succeeded = results.filter(r => r.success);
      
      this.logger.info('Process completed', {
        context: FloodManagementService.name,
        succeeded: succeeded.length,
        failed: failed.length,
        total: results.length
      });

      if (failed.length > 0) {
        // Store failed records
        const failedRecords = failed.map(f => ({
          projectNumber: f.projectNumber,
          error: f.error,
          timestamp: new Date().toISOString()
        }));
        
        await FileUtils.writeFailedRecords(
          Const_Config.FLOOD_MANAGEMENT_CONFIG.FAILED_RECORDS_FILE,
          failedRecords
        );
        
        this.logger.warn(`${failed.length} records failed and saved for retry`, {
          context: FloodManagementService.name,
          failedCount: failed.length,
          failedProjects: failed.map(f => f.projectNumber)
        });
      } else if (isRetry) {
        // All retries succeeded, delete the failed records file
        await FileUtils.deleteFailedRecordsFile(
          Const_Config.FLOOD_MANAGEMENT_CONFIG.FAILED_RECORDS_FILE
        );
        this.logger.info('All retries succeeded, cleaned up failed records file', {
          context: FloodManagementService.name
        });
      }
    } catch (error) {
      this.logger.error('Failed to process flood management projects', {
        context: FloodManagementService.name,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  private mapUDRDataToProjects(udrData: any[]): FloodProjectDto[] {
    // UDR returns data with report_header and report_row structure
    if (!udrData || udrData.length === 0) {
      this.logger.warn('No UDR data received', {
        context: FloodManagementService.name
      });
      return [];
    }

    // Extract the first data item which contains report structure
    const reportData = udrData[0];
    
    if (!reportData.report_row || !Array.isArray(reportData.report_row)) {
      this.logger.warn('Invalid UDR response structure: missing report_row', {
        context: FloodManagementService.name
      });
      return [];
    }

    // Map report rows to FloodProjectDto
    const projects = reportData.report_row
      .map(row => ({
        projectNumber: row.c1, // PMO Code (ERP)
        projectName: row.c2,   // Project Name
      }))
      .filter(p => p.projectNumber && p.projectNumber.trim() !== ''); // Filter out empty project numbers

    this.logger.info(`Mapped ${projects.length} projects from UDR response`, {
      context: FloodManagementService.name,
      count: projects.length
    });
    return projects;
  }

  private async createRecordsForProjects(
    projects: FloodProjectDto[]
  ): Promise<CreateRecordResult[]> {
    const results: CreateRecordResult[] = [];
    
    // Process sequentially to avoid overwhelming the API
    for (const project of projects) {
      if (project.projectNumber === "P-0531" || project.projectNumber === "P-0569") {
        const result = await this.createRecordWithRetry(project);
        results.push(result);
        
        // Optional: Add a small delay between requests
        await this.delay(1000);
      }
    }
    
    return results;
  }

  private async createRecordWithRetry(
    project: FloodProjectDto,
    retryCount: number = 0
  ): Promise<CreateRecordResult> {
    try {
      this.logger.debug(`Creating record for project: ${project.projectNumber}`, {
        context: FloodManagementService.name,
        projectNumber: project.projectNumber,
        retryCount
      });
      
      // Create empty record as specified
      const data = await this.unifierWrapper.createBPRecord(
        encodeURIComponent(project.projectNumber),
        Const_Config.FLOOD_MANAGEMENT_CONFIG.BP_NAME,
        {}, // Empty record
        { timeout: 60000 }
      );
      console.log(data);
      
      this.logger.info(`✓ Successfully created record for project: ${project.projectNumber}`, {
        context: FloodManagementService.name,
        projectNumber: project.projectNumber,
        response: JSON.stringify(data)
      });
      
      return {
        projectNumber: project.projectNumber,
        success: true
      };
    } catch (error) {
      const errorMessage = error.message || JSON.stringify(error);
      
      if (retryCount < Const_Config.FLOOD_MANAGEMENT_CONFIG.RETRY_ATTEMPTS) {
        this.logger.warn(
          `Failed to create record for ${project.projectNumber}, retrying (${retryCount + 1}/${Const_Config.FLOOD_MANAGEMENT_CONFIG.RETRY_ATTEMPTS})...`,
          {
            context: FloodManagementService.name,
            projectNumber: project.projectNumber,
            retryCount: retryCount + 1,
            maxRetries: Const_Config.FLOOD_MANAGEMENT_CONFIG.RETRY_ATTEMPTS,
            error: errorMessage
          }
        );
        
        // Wait before retrying (exponential backoff)
        await this.delay(Const_Config.FLOOD_MANAGEMENT_CONFIG.RETRY_DELAY_MS * (retryCount + 1));
        
        return this.createRecordWithRetry(project, retryCount + 1);
      }
      
      this.logger.error(
        `✗ Failed to create record for ${project.projectNumber} after ${Const_Config.FLOOD_MANAGEMENT_CONFIG.RETRY_ATTEMPTS} attempts`,
        {
          context: FloodManagementService.name,
          projectNumber: project.projectNumber,
          attempts: Const_Config.FLOOD_MANAGEMENT_CONFIG.RETRY_ATTEMPTS,
          error: errorMessage,
          stack: error.stack
        }
      );
      
      return {
        projectNumber: project.projectNumber,
        success: false,
        error: errorMessage
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}