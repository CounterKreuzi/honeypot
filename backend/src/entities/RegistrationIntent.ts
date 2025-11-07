// backend/src/entities/RegistrationIntent.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('registration_intents')
export class RegistrationIntent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // We want to quickly look up by email and avoid duplicates
  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  token: string;

  @Column({ type: 'timestamp' })
  tokenExpiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

