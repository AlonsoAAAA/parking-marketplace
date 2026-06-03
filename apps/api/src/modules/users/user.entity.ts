import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  name: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ default: 'whatsapp' })
  channel: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'parent_operator_id', nullable: true, type: 'uuid' })
  parentOperatorId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
