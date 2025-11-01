import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Post } from '../../post/entities/post.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseTimestampEntity } from '../../../base.entity';
import { PostParticipationStatus } from '../../../../output/post-participation-status.js';

@Entity('post_participation', { schema: 'public' })
export class PostParticipation extends BaseTimestampEntity {
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
