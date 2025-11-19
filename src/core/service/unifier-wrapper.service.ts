import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnifierRESTService } from '@ashghal-apms/core'; // Import from your git library

@Injectable()
export class UnifierWrapperService {
  private readonly logger = new Logger(UnifierWrapperService.name);
  private unifierService: UnifierRESTService;

  constructor(private configService: ConfigService) {
    this.initializeUnifierService();
  }

  private initializeUnifierService() {
    const baseURL = this.configService.get<string>('UNIFIER_BASE_URL');
    const userName = this.configService.get<string>('UNIFIER_USERNAME');
    const password = this.configService.get<string>('UNIFIER_PASSWORD');
    const timeout = this.configService.get<number>('UNIFIER_TIMEOUT', 30000);

    if (!baseURL || !userName || !password) {
      throw new Error('Unifier configuration is incomplete. Check environment variables.');
    }

    this.unifierService = new UnifierRESTService(
      baseURL,
      userName,
      password,
      { timeout }
    );

    this.logger.log('UnifierRESTService initialized successfully');
  }

  async getUDRRecords(udrReportName: string, options: { timeout?: number } = {}): Promise<any[]> {
    this.logger.debug(`Fetching UDR records for: ${udrReportName}`);
    console.log(options)
    return this.unifierService.getUDRRecords(udrReportName, options);
  }

  async createBPRecord(
    projectNumber: string,
    bpName: string,
    data: any,
    options: { timeout?: number } = {}
  ): Promise<any> {
    this.logger.debug(`Creating BP record for project: ${projectNumber}, BP: ${bpName}`);
    return this.unifierService.createBPRecord(projectNumber, bpName, data, options);
  }
}