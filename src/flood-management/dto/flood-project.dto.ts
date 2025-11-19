export interface FloodProjectDto {
  projectNumber: string;
  projectName?: string;
  // Add other relevant fields from your UDR
}

export interface CreateRecordResult {
  projectNumber: string;
  success: boolean;
  error?: string;
}