import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import type { ColumnType } from 'typeorm';
import { BaseTimestampEntity } from '../../../base.entity';
import { Users } from '../../users/entities/users.entity';
import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
import { TendencyType } from '../../profile/entities/tendency-type.enum';

@Index('matching_profile_user_id_key', ['user'], { unique: true })
@Entity('matching_profile', { schema: 'public' })
export class MatchingProfile extends BaseTimestampEntity {
  @OneToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  @Column({ type: 'text', name: 'profile_detail', nullable: true })
  profileDetail: string | null;

  @Column({ type: 'text', name: 'profile_summary', nullable: true })
  profileSummary: string | null;

  @Column({
    type: 'enum',
    enum: TravelStyleType,
    enumName: 'travel_style_type',
    array: true,
    default: () => "'{}'::travel_style_type[]",
  })
  travelTendencyTypes: TravelStyleType[];

  @Column({
    type: 'enum',
    enum: TendencyType,
    enumName: 'travel_tendency_type',
    array: true,
    default: () => "'{}'::travel_tendency_type[]",
  })
  travelTendencies: TendencyType[];

  @Column({
    type: 'vector' as ColumnType,
    name: 'profile_embedding',
    nullable: true,
  })
  profileEmbedding: number[] | null;
}
