import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { PlanDay } from './plan-day.entity';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('poi', { schema: 'public' })
export class Poi extends BaseTimestampEntity {
  @Column({ type: 'text', name: 'place_name' })
  placeName: string;

  @Column({ type: 'double precision', name: 'longitude', precision: 53 })
  longitude: number;

  @Column({ type: 'double precision', name: 'latitude', precision: 53 })
  latitude: number;

  @Column({ type: 'text', name: 'address' })
  address: string;

  @ManyToOne(() => Users, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'created_by', referencedColumnName: 'id' }])
  createdBy: Users;

  @ManyToOne(() => PlanDay, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'plan_day_id', referencedColumnName: 'id' }])
  planDay: PlanDay;
}
