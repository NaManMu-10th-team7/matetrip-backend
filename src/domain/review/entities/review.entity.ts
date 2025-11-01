import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Post } from '../../post/entities/post.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('review', { schema: 'public' })
export class Review extends BaseTimestampEntity {
  @Column({ type: 'numeric', name: 'rating', precision: 2, scale: 1 })
  rating: string;

  @Column({ type: 'text', name: 'content' })
  content: string;

  @ManyToOne(() => Post, { onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'post_id', referencedColumnName: 'id' }])
  post: Post;

  @ManyToOne(() => Users, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'reviewee_id', referencedColumnName: 'id' }])
  reviewee: Users;

  @ManyToOne(() => Users, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'reviewer_id', referencedColumnName: 'id' }])
  reviewer: Users;
}
