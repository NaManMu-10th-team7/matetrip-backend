import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  Unique,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import type { ColumnType } from 'typeorm';
import { BinaryContent } from '../../binary-content/entities/binary-content.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseTimestampEntity } from '../../../base.entity';
import { GENDER } from './gender.enum.js';
import { TravelStyleType } from './travel-style-type.enum.js';
import { TendencyType } from './tendency-type.enum.js';
import { MBTI_TYPES } from './mbti.enum';

// TypeORM이 기본적으로 `{"...","..."}` 형태로 배열을 직렬화하는 탓에
// pgvector 컬럼이 요구하는 `[0.1,0.2,...]` 포맷과 충돌했다.
// 아래 변환기로 엔티티에서는 number[]를 그대로 쓰되 DB 입출력만 pgvector 형식으로 맞춰준다.
const vectorTransformer: ValueTransformer = {
  to(value: number[] | null): string | null {
    if (!value || value.length === 0) {
      return null;
    }
    // pgvector expects bracketed comma-separated numbers: [0.1,0.2,...]
    return `[${value.join(',')}]`;
  },
  from(value: string | number[] | null): number[] | null {
    if (!value) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map((num) => Number(num));
    }
    const trimmed = value.trim();
    const content = trimmed.replace(/^\[|\]$/g, '');
    if (!content) {
      return [];
    }
    return content.split(',').map((num) => Number(num));
  },
};

@Unique('profile_user_id_key', ['user'])
@Entity('profile', { schema: 'public' })
export class Profile extends BaseTimestampEntity {
  /*id와 created_at은 기본제공*/

  /*updated_at*/
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date | null;

  /*nickname*/
  @Column({ type: 'text', name: 'nickname' })
  nickname: string;

  /*Gender*/
  @Column({
    type: 'enum',
    name: 'gender',
    enum: GENDER,
    enumName: 'gender',
    default: GENDER.MALE,
    nullable: false,
  })
  gender: GENDER;

  /*intro*/
  @Column({ type: 'text', name: 'intro', nullable: true })
  intro: string;

  /*description*/
  @Column({ type: 'text', name: 'description', nullable: true })
  description: string;

  @Column({
    type: 'numeric',
    name: 'manner_temperature',
    precision: 4,
    scale: 1,
    default: () => '36.5',
  })
  mannerTemperature: number;

  /*travel_style*/
  @Column({
    type: 'enum',
    name: 'travel_styles',
    enum: TravelStyleType,
    enumName: 'travel_style_type',
    array: true,
    default: () => "'{}'::travel_style_type[]",
  })
  travelStyles: TravelStyleType[];

  /*travel_tendency*/
  @Column({
    type: 'enum',
    name: 'tendency',
    enum: TendencyType,
    enumName: 'travel_tendency_type',
    array: true,
    default: () => "'{}'::travel_tendency_type[]",
  })
  tendency: TendencyType[];

  @Column({
    type: 'enum',
    name: 'mbti',
    enum: MBTI_TYPES,
    enumName: 'mbti_type',
  })
  mbtiTypes: MBTI_TYPES;

  @Column({
    type: 'vector' as ColumnType,
    name: 'profile_embedding',
    length: 1024,
    nullable: true,
    transformer: vectorTransformer,
  })
  profileEmbedding: number[] | null;

  @OneToOne(() => BinaryContent, { onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'profile_image_id', referencedColumnName: 'id' }])
  profileImage: BinaryContent | null;

  @OneToOne(() => Users, (users) => users.profile, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;
}
