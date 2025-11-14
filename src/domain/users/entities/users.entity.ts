import { Column, Entity, OneToOne, UpdateDateColumn } from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('users', { schema: 'public' })
export class Users extends BaseTimestampEntity {
  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'updated_at',
    nullable: true,
  })
  updatedAt: Date | null;

  @Column({ type: 'text', name: 'email', unique: true })
  email: string;

  @Column({ type: 'text', name: 'hashed_password' })
  hashedPassword: string;

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;
}
