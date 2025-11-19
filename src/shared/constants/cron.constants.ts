
export class Const_Config {
  static readonly CRON_EXPRESSIONS = {
    SEPT_1_ANNUALLY: process.env.CRON_SEPT_1 ,
    SEPT_2_ANNUALLY: process.env.CRON_SEPT_2 ,
  };

  static readonly FLOOD_MANAGEMENT_CONFIG = {
    BP_NAME: process.env.FLOOD_BP_NAME,
    UDR_NAME: process.env.FLOOD_UDR_NAME,
    FAILED_RECORDS_FILE: process.env.FLOOD_FAILED_RECORDS_FILE || './failed-records.json',
    RETRY_ATTEMPTS: parseInt(process.env.FLOOD_RETRY_ATTEMPTS || '3', 10),
    RETRY_DELAY_MS: parseInt(process.env.FLOOD_RETRY_DELAY_MS || '5000', 10),
  };
}