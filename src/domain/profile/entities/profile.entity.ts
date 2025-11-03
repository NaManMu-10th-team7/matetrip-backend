import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { BinaryContent } from '../../binary-content/entities/binary-content.entity';
import { Users } from '../../users/entities/users.entity';
import { BaseTimestampEntity } from '../../../base.entity';
import { GENDER } from './gender.enum.js';
import { TravelStyleType } from './travel-style-type.enum.js';
import { TendencyType } from './tendency-type.enum.js';
//import { MBTI_TYPES } from './mbti.enum';

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

  /*description*/
  @Column({ type: 'text', name: 'description' })
  description: string;

  // /*shortDescription*/
  // @Column({ type: 'text', name: 'short_description' })
  // shortDescription: string;

  // @Column({
  //   type: 'enum',
  //   name: 'mbti',
  //   enum: MBTI_TYPES,
  //   enumName: 'mbti_type',
  // })
  // mbtiTypes: MBTI_TYPES;

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

  /*tendency*/
  @Column({
    type: 'enum',
    name: 'tendency',
    enum: TendencyType,
    enumName: 'tendency_type',
    array: true,
    default: () => "'{}'::tendency_type[]",
  })
  tendency: TendencyType[];

  @ManyToOne(() => BinaryContent, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn([{ name: 'profile_image_id', referencedColumnName: 'id' }])
  profileImage: BinaryContent | null;

  @OneToOne(() => Users, (users) => users.profile, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;
}
