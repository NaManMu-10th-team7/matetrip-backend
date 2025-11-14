import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { Poi } from './poi.entity';
import { PlanDay } from './plan-day.entity';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('poi_connection', { schema: 'public' })
export class PoiConnection extends BaseTimestampEntity {
  @Column({ type: 'integer', name: 'distance' })
  distance: number;

  @Column({ type: 'integer', name: 'duration' })
  duration: number;

  @OneToOne(() => Poi, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'next_poi_id', referencedColumnName: 'id' }])
  nextPoi: Poi;

  // @RelationId((poiConnection: PoiConnection) => poiConnection.nextPoi)
  // nextPoiId: string;

  @OneToOne(() => Poi, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'prev_poi_id', referencedColumnName: 'id' }])
  prevPoi: Poi;

  // @RelationId((poiConnection: PoiConnection) => poiConnection.prevPoi)
  // prevPoiId: string;

  @OneToOne(() => PlanDay, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'plan_day_id', referencedColumnName: 'id' }])
  planDay: PlanDay;

  // @RelationId((poiConnection: PoiConnection) => poiConnection.planDay)
  // planDayId: string;
}
