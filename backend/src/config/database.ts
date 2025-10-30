import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'honeypot_user',
  password: process.env.DB_PASSWORD || 'dev_password_123',
  database: process.env.DB_NAME || 'honeypot_db',
  synchronize: process.env.NODE_ENV === 'development', // Auto-sync in dev
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
});
