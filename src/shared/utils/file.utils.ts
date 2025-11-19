import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '@nestjs/common';

export class FileUtils {
  private static readonly logger = new Logger(FileUtils.name);
  private static readonly STORAGE_DIR = join(process.cwd(), 'storage');

  static async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(this.STORAGE_DIR, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create storage directory: ${error.message}`);
      throw error;
    }
  }

  static async writeFailedRecords(
    filename: string,
    records: Array<{ projectNumber: string; error: string; timestamp: string }>
  ): Promise<void> {
    await this.ensureStorageDir();
    const filePath = join(this.STORAGE_DIR, filename);
    
    const content = records
      .map(r => `${r.timestamp}|${r.projectNumber}|${r.error}`)
      .join('\n');
    
    await fs.writeFile(filePath, content, 'utf-8');
    this.logger.log(`Written ${records.length} failed records to ${filePath}`);
  }

  static async readFailedRecords(
    filename: string
  ): Promise<Array<{ projectNumber: string; error: string; timestamp: string }>> {
    await this.ensureStorageDir();
    const filePath = join(this.STORAGE_DIR, filename);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [timestamp, projectNumber, error] = line.split('|');
          return { timestamp, projectNumber, error };
        });
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  static async deleteFailedRecordsFile(filename: string): Promise<void> {
    const filePath = join(this.STORAGE_DIR, filename);
    try {
      await fs.unlink(filePath);
      this.logger.log(`Deleted failed records file: ${filePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.warn(`Failed to delete file ${filePath}: ${error.message}`);
      }
    }
  }
}