import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';
import { Beekeeper } from '../entities/Beekeeper';
import { HoneyType } from '../entities/HoneyType';
import { RegistrationIntent } from '../entities/RegistrationIntent';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  synchronize: true, // Erstellt Tabellen automatisch
  logging: !isProduction,
  entities: [User, Beekeeper, HoneyType, RegistrationIntent],
  migrations: [],
  subscribers: [],
});
