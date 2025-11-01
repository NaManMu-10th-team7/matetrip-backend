import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Post } from '../../post/entities/post.entity';
import { BaseUuidEntity } from '../../../base.entity';

@Entity('workspace', { schema: 'public' })
export class Workspace extends BaseUuidEntity {
  @Column({ type: 'uuid', name: 'post_id', unique: true })
  postId: string;

  @Column({ type: 'text', name: 'workspace_name' })
  workspaceName: string;

  @Column({ type: 'double precision', name: 'base_longitude', precision: 53 })
  baseLongitude: number;

  @Column({ type: 'double precision', name: 'base_latitude', precision: 53 })
  baseLatitude: number;

  @OneToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'post_id', referencedColumnName: 'id' }])
  post: Post;
}
