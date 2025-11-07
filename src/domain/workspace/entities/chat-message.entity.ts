import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { BaseTimestampEntity } from '../../base.entity.js';
import { Users } from '../../users/entities/users.entity.js';
import { Workspace } from './workspace.entity.js';

@Entity('chat_message')
export class ChatMessage extends BaseTimestampEntity {
  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // TODO : 유저 탈퇴 시 onDelete 옵션 어케할지 나중에 ㄱ
  @ManyToOne(() => Users, { onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  // TODO : 워크스페이스 삭제 시 onDelete 옵션 어케할지 나중에 ㄱ
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'workspace_id', referencedColumnName: 'id' }])
  workspace: Workspace;

  @Column({ type: 'text', nullable: false })
  content: string;
}
