import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { PostStatus } from './post-status.enum.js';
import { BaseTimestampEntity } from '../../base.entity.js';
import { KeywordType } from './keywords-type.enum.js';
import { PostParticipation } from '../../post-participation/entities/post-participation.entity.js';
import { BinaryContent } from '../../binary-content/entities/binary-content.entity';

@Entity('post')
export class Post extends BaseTimestampEntity {
  @Column({ type: 'text', name: 'title' })
  title: string;

  @Column({ type: 'text', name: 'content' })
  content: string;

  @Column({
    type: 'enum',
    name: 'status',
    enum: PostStatus,
    enumName: 'post_status',
    default: PostStatus.RECRUITING,
  })
  status: PostStatus = PostStatus.RECRUITING;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', name: 'location' })
  location: string; // 여행 장소 (배열로 할지 말지 나중에 정하기)

  @Column({ type: 'integer', name: 'max_participants' })
  maxParticipants: number;

  @Column({
    type: 'enum',
    name: 'keywords',
    enum: KeywordType,
    enumName: 'keyword_type',
    array: true,
    default: () => "'{}'::keyword_type[]",
  })
  keywords: KeywordType[] = []; // 걍 초기화

  @ManyToOne((): typeof Users => Users, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'writer_id', referencedColumnName: 'id' }])
  writer: Users;

  @OneToMany(
    () => PostParticipation,
    (postParticipation) => postParticipation.post,
  )
  participations: PostParticipation[];

  @OneToOne(() => BinaryContent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn([{ name: 'image_id', referencedColumnName: 'id' }])
  image: BinaryContent | null;
}
