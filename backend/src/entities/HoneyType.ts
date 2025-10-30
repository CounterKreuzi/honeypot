import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { Beekeeper } from './Beekeeper';

@Entity('honey_types')
export class HoneyType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Beekeeper, (beekeeper) => beekeeper.honeyTypes, {
    onDelete: 'CASCADE',
  })
  beekeeper: Beekeeper;

  @Column()
  name: string; // z.B. "Blütenhonig", "Waldhonig", "Akazienhonig"

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price?: number; // Preis pro kg oder Glas

  @Column({ nullable: true })
  unit?: string; // "kg", "500g Glas", "250g Glas"

  @Column({ default: true })
  available: boolean;

  @Column({ nullable: true })
  image?: string; // Cloudinary URL

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
