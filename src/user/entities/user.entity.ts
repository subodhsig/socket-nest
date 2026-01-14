import { Exclude } from 'class-transformer';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// NEW imports for attachments & comments
import { IsNotEmpty } from 'class-validator';

import { Role } from '../../common/enums/user.role.enum';

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 80 })
  first_name: string;

  @Column({ type: 'varchar', length: 80 })
  last_name: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Exclude()
  password?: string | null; // nullable until user sets password

  @Column({ type: 'varchar', length: 20, unique: true })
  phone: string;

  @Column({ type: 'varchar', length: 120 })
  designation: string;

  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  department_name?: string;

  @Column({
    type: 'enum',
    enum: Role,
    enumName: 'user_role_enum',
    default: Role.USER,
  })
  user_role: Role;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  created_by?: User | string;

  // Fields for invite / password creation flow
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpires?: Date | null;

  @Column()
  @IsNotEmpty()
  profileImage: string;

  @Column({ type: 'boolean', default: false })
  isActive: boolean; //for password

  // Relations

  // --- NEW relations for attachments & comments ---

  @DeleteDateColumn({
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;
}
