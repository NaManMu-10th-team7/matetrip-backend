import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseUuidEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}

export abstract class BaseTimestampEntity extends BaseUuidEntity {
  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;
}
