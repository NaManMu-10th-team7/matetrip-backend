import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Poi } from '../../poi/entities/poi.entity';
import { PlanDay } from '../../plan-day/entities/plan-day.entity';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('poi_connection', { schema: 'public' })
export class PoiConnection extends BaseTimestampEntity {
  @Column({ type: 'integer', name: 'distance' })
  distance: number;

  @Column({ type: 'integer', name: 'duration' })
  duration: number;

  @ManyToOne(() => Poi, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'next_poi_id', referencedColumnName: 'id' }])
  nextPoi: Poi;

  @ManyToOne(() => PlanDay, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'plan_day_id', referencedColumnName: 'id' }])
  planDay: PlanDay;

  @ManyToOne(() => Poi, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'prev_poi_id', referencedColumnName: 'id' }])
  prevPoi: Poi;
}
