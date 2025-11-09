import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Users } from '../../users/entities/users.entity';
import { PlanDay } from './plan-day.entity';
import { BaseTimestampEntity } from '../../../base.entity';

enum PoiStatus {
  MARKED = 'MARKED',
  SCHEDULED = 'SCHEDULED',
}

@Entity('poi', { schema: 'public' })
export class Poi extends BaseTimestampEntity {
  @ManyToOne(() => Users, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'created_by', referencedColumnName: 'id' }])
  createdBy: Users;

  @ManyToOne(() => PlanDay, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'plan_day_id', referencedColumnName: 'id' }])
  planDay?: PlanDay;

  @Column({ type: 'text', name: 'place_name', nullable: false })
  placeName: string;

  @Column({
    type: 'double precision',
    name: 'longitude',
    precision: 53,
    nullable: false,
  })
  longitude: number;

  @Column({
    type: 'double precision',
    name: 'latitude',
    precision: 53,
    nullable: false,
  })
  latitude: number;

  @Column({ type: 'text', name: 'address', nullable: false })
  address: string;

  @Column({
    type: 'enum',
    name: 'poi_status',
    enum: PoiStatus,
    enumName: 'poi_status',
    default: PoiStatus.MARKED,
  })
  status: PoiStatus = PoiStatus.MARKED;

  @Column({ type: 'int', name: 'sequence', nullable: false, default: 0 })
  sequence: number = 0;
}
