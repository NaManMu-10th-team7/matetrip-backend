// src/domain/review/entities/review.entity.ts
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
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
  //  id는 BaseTimestampEntity에 이미 있으므로 여기선 선언하지 않습니다.

  /** 게시글(FK: post_id) — NULL 허용 */
  @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'post_id', referencedColumnName: 'id' })
  post?: Post | null;

  /** 리뷰 작성자(FK: reviewer_id) — NOT NULL */
  @ManyToOne(() => Users, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewer_id', referencedColumnName: 'id' })
  reviewer!: Users;

  /** 리뷰 대상자(FK: reviewee_id) — NOT NULL */
  @ManyToOne(() => Users, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'reviewee_id', referencedColumnName: 'id' })
  reviewee!: Users;

  /** 평점 NUMERIC(10,1) → 코드상 number로 사용 */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 1,
    transformer: decimalToNumber,
  })
  rating!: number;

  /** 내용 TEXT */
  @Column({ type: 'text' })
  content!: string;

  // created_at은 BaseTimestampEntity 쪽에서 제공(없다면 @CreateDateColumn 추가)
}
