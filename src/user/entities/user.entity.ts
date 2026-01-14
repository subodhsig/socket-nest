import { Exclude } from 'class-transformer';

import { ProjectMember } from '../../projects/entities/project-member.entity';
import { Project } from '../../projects/entities/project.entity';
import { Subtask } from '../../subtasks/entities/subtask.entity';

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
import { Worklog } from '../../worklogs/entities/worklog.entity';

// NEW imports for attachments & comments
import { IsNotEmpty } from 'class-validator';
import { Notification } from 'src/notification/entities/notification.entity';
import { Attachment } from '../../attachments/entities/attachment.entity';
import { Comment } from '../../comments/entities/comment.entity';
import { Role } from '../../common/enums/user.role.enum';
import { Task } from '../../tasks/entities/task.entity';

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
  @OneToMany(() => Project, (p) => p.owner)
  owned_projects?: Project[];

  @OneToMany(() => ProjectMember, (pm) => pm.user)
  project_memberships?: ProjectMember[];

  @OneToMany(() => Task, (t) => t.owner)
  owned_tasks?: Task[];

  @OneToMany(() => Task, (t) => t.assignee)
  assigned_tasks?: Task[];

  @OneToMany(() => Subtask, (s) => s.reporter)
  reported_subtasks?: Subtask[];

  @OneToMany(() => Subtask, (s) => s.assignee)
  assigned_subtasks?: Subtask[];

  @OneToMany(() => Worklog, (w) => w.user)
  worklogs?: Worklog[];

  @OneToMany(() => Notification, (n) => n.user)
  notifications: Notification[];

  // --- NEW relations for attachments & comments ---
  @OneToMany(() => Attachment, (a) => a.uploaded_by)
  attachments?: Attachment[];

  @OneToMany(() => Comment, (c) => c.author)
  comments?: Comment[];

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
