import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env FIRST - before any other imports that might use env variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Now import everything else
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Debug: Check if env vars are loaded
console.log('Environment loaded:');
console.log('FLOOD_BP_NAME:', process.env.FLOOD_BP_NAME);
console.log('FLOOD_UDR_NAME:', process.env.FLOOD_UDR_NAME);
console.log('Current working directory:', process.cwd());

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();