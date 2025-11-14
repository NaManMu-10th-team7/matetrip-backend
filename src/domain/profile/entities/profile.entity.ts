import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { ColumnType } from 'typeorm';
import { BinaryContent } from '../../binary-content/entities/binary-content.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseTimestampEntity } from '../../../base.entity';
import { GENDER } from './gender.enum.js';
import { TravelStyleType } from './travel-style-type.enum.js';
import { TendencyType } from './tendency-type.enum.js';
import { MBTI_TYPES } from './mbti.enum';

import { vectorTransformer } from '../../../common/transformers/vector-transformer.js';

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
