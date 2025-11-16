import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseUuidEntity } from '../../../base.entity.js';
import { Users } from '../../users/entities/users.entity.js';
import { Place } from '../../place/entities/place.entity.js';
import { Workspace } from '../../workspace/entities/workspace.entity.js';
import { PlanDay } from '../../workspace/entities/plan-day.entity.js';

@Entity('user_behavior_events')
export class UserBehaviorEvent extends BaseUuidEntity {
  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @ManyToOne(() => Workspace, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace | null;

  @ManyToOne(() => Place, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'place_id' })
  place: Place | null;

  @ManyToOne(() => PlanDay, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'plan_day_id' })
  planDay: PlanDay | null;

  @Column({ type: 'text', name: 'event_type' })
  eventType: string; // POI_MARK, POI_SCHEDULE, POI_UNMARK, POI_UNSCHEDULE

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  weight: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
  })
  createdAt: Date;
}
