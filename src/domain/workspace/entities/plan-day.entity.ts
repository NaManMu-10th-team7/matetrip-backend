import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Workspace } from './workspace.entity';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('plan_day', { schema: 'public' })
export class PlanDay extends BaseTimestampEntity {
  @Column({ type: 'integer', name: 'day_no' })
  dayNo: number;

  @Column({ type: 'date', name: 'plan_date', nullable: true })
  planDate: string | null;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' }) // WorkSpace가 onDelete:CASCADE
  @JoinColumn([{ name: 'workspace_id', referencedColumnName: 'id' }])
  workspace: Workspace;
}
