import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from '../users/entities/users.entity';
import { Workspace } from '../workspace/entities/workspace.entity';
import { BaseTimestampEntity } from '../../base.entity';

@Entity('chat_message', { schema: 'public' })
export class ChatMessage extends BaseTimestampEntity {
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date | null;

  @Column({ type: 'text', name: 'content' })
  content: string;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workspace_id', referencedColumnName: 'id' }])
  workspace: Workspace;
}
