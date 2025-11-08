// backend/src/entities/User.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { Beekeeper } from './Beekeeper';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 'beekeeper' })
  role: string;

  @Column({ default: false })
  isVerified: boolean;

  // ============================================================================
  // 🆕 E-MAIL VERIFICATION & PASSWORD RESET
  // ============================================================================

  @Column({ nullable: true, type: 'varchar', length: 255 })
  verificationToken: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  verificationTokenExpires: Date | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  resetPasswordToken: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  resetPasswordTokenExpires: Date | null;

  // ============================================================================
  // EMAIL CHANGE (2FA via code to current email)
  // ============================================================================

  @Column({ nullable: true, type: 'varchar', length: 255 })
  changeEmailCode: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  changeEmailCodeExpires: Date | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  changeEmailNewAddress: string | null;

  // ============================================================================

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Beekeeper, (beekeeper) => beekeeper.user)
  beekeeper: Beekeeper;
}
