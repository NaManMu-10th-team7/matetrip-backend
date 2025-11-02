// src/domain/review/entities/review.entity.ts
import { Column, Entity, ManyToOne } from 'typeorm';
import { Post } from '../../post/entities/post.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseTimestampEntity } from '../../../base.entity';

// NUMERIC(10,1)을 number로 쓰기 위한 transformer
const decimalToNumber = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? null : Number(v)),
};

@Entity({ name: 'review', schema: 'public' })
export class Review extends BaseTimestampEntity {
  // ⛔ id는 BaseTimestampEntity에 이미 있으므로 여기선 선언하지 않습니다.

  @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
  post?: Post | null;

  @ManyToOne(() => Users, { nullable: false, onDelete: 'RESTRICT' })
  reviewer: Users;

  @ManyToOne(() => Users, { nullable: false, onDelete: 'RESTRICT' })
  reviewee: Users;

  @Column({ type: 'numeric', precision: 10, scale: 1, transformer: decimalToNumber })
  rating: number; // 0.0 ~ 5.0

  @Column({ type: 'text' })
  content: string;

  // created_at은 BaseTimestampEntity 쪽에서 제공(없다면 @CreateDateColumn 추가)
}
