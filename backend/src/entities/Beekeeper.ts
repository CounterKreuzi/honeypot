import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './User';
import { HoneyType } from './HoneyType';

@Entity('beekeepers')
export class Beekeeper {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  name: string;

  // Stammdaten (optional detailliert)
  @Column({ nullable: true })
  salutation?: string; // Herr | Frau | Divers

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  companyName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  logo?: string; // Cloudinary URL

  @Column({ nullable: true })
  photo?: string; // Cloudinary URL

  // Standort
  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column()
  address: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  postalCode?: string;

  @Column({ nullable: true })
  country?: string;

  // Kontakt
  @Column({ nullable: true })
  phone?: string;

  // Neues Schema: getrennte Rufnummern
  @Column({ nullable: true })
  customerPhone?: string;

  @Column({ nullable: true })
  adminPhone?: string;

  @Column({ nullable: true })
  website?: string;

  // Öffnungszeiten (als JSON gespeichert)
  @Column({ type: 'jsonb', nullable: true })
  openingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };

  // Honigsorten Relation
  @OneToMany(() => HoneyType, (honeyType) => honeyType.beekeeper, {
    cascade: true,
  })
  honeyTypes: HoneyType[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
