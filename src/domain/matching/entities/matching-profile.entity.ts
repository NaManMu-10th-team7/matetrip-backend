import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import type { ColumnType } from 'typeorm';
import { Users } from '../../users/entities/users.entity';

@Entity('matching_profile', { schema: 'public' })
export class MatchingProfile {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  userId: string;

  @OneToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'user_id', referencedColumnName: 'id' }])
  user: Users;

  @Column({ type: 'text', name: 'profile_summary', nullable: true })
  profileSummary: string | null;

  @Column({
    type: 'vector(1024)' as ColumnType,
    name: 'profile_embedding',
    nullable: true,
  })
  profileEmbedding: number[] | null;
}
