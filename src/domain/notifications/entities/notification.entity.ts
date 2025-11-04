import { BaseTimestampEntity } from 'src/domain/base.entity';
import { Users } from 'src/domain/users/entities/users.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

@Entity('notification')
export class Notification extends BaseTimestampEntity {
  // 수신자
  @ManyToOne(() => Users, { eager: false })
  @JoinColumn({ name: 'user_id' })
  userId: Users;

  // 확인 여부
  @Column({ default: false })
  confirmed: boolean;

  // 메시지
  @Column()
  content: string;
}
