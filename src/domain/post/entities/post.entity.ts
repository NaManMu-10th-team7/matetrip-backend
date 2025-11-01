import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { BaseUuidEntity } from '../../../base.entity';
import { PostStatus } from './post-status.enum.js';
import { KeywordType } from '../../enum/keywords-type.enum.js';

@Entity('post', { schema: 'public' })
export class Post extends BaseUuidEntity {
  @Column({ type: 'text', name: 'title' })
  title: string;

  @Column({
    type: 'enum',
    name: 'status',
    enum: PostStatus,
    enumName: 'post_status',
  })
  status: PostStatus;

  @Column({ type: 'text', name: 'location' })
  location: string;

  @Column({
    type: 'enum',
    name: 'keywords',
    enum: KeywordType,
    enumName: 'keyword_type',
    array: true,
  })
  keywords: KeywordType[];

  @ManyToOne((): typeof Users => Users, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'writer_id', referencedColumnName: 'id' }])
  writer: Users;
}
