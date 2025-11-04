import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Post } from '../../post/entities/post.entity';
import { Users } from '../../users/entities/users.entity';
import { PostParticipationStatus } from './post-participation-status.js';

@Entity('post_participation', { schema: 'public' })
export class PostParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    name: 'requested_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  requestedAt: Date;

  @Column({
    type: 'enum',
    name: 'status',
    enum: PostParticipationStatus,
    enumName: 'post_participation_status',
  })
  status: PostParticipationStatus;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'requester_id', referencedColumnName: 'id' }])
  requester: Users;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'post_id', referencedColumnName: 'id' }])
  post: Post;
}
