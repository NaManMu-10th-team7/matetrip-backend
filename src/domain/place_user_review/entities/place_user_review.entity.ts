import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseTimestampEntity } from '../../../base.entity';
import { Place } from '../../place/entities/place.entity';
import { Users } from '../../users/entities/users.entity';

// NUMERIC(2,1)을 number로 쓰기 위한 transformer
const decimalToNumber = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v == null ? null : Number(v)),
};

@Entity('place_user_review', { schema: 'public' })
export class PlaceUserReview extends BaseTimestampEntity {
  @ManyToOne(() => Place, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'place_id', referencedColumnName: 'id' })
  place: Place;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Users;

  @Column({ type: 'text', nullable: false })
  content: string;

  @Column({
    type: 'numeric',
    precision: 2,
    scale: 1,
    nullable: false,
    transformer: decimalToNumber,
  })
  rating: number;
}
