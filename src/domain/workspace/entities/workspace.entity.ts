import { Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';
import { Post } from '../../post/entities/post.entity';
import { BaseUuidEntity } from '../../../base.entity';

@Entity('workspace', { schema: 'public' })
@Unique(['post_id'])
export class Workspace extends BaseUuidEntity {
  @Column({ type: 'text', name: 'workspace_name' })
  workspaceName: string;

  // @Column({ type: 'double precision', name: 'base_longitude', precision: 53 })
  // baseLongitude: number;

  // @Column({ type: 'double precision', name: 'base_latitude', precision: 53 })
  // baseLatitude: number;

  @OneToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'post_id', referencedColumnName: 'id' }])
  post: Post;
}
