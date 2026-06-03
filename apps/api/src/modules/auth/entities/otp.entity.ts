import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('otp_codes')
export class OtpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  otp: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'locked_until', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
