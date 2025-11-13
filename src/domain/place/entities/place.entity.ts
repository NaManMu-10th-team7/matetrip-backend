import { Column, Entity } from 'typeorm';
import type { ColumnType } from 'typeorm';
import { BaseTimestampEntity } from '../../base.entity.js';
import { vectorTransformer } from '../../../common/transformers/vector-transformer.js';

@Entity('places')
export class Place extends BaseTimestampEntity {
  @Column()
  title: string;

  @Column()
  address: string;

  @Column({ type: 'float', nullable: false })
  latitude: number;

  @Column({ type: 'float', nullable: false })
  longitude: number;

  @Column({ type: 'text', nullable: false })
  category: string;

  @Column({ type: 'text', nullable: true })
  image_url?: string;

  @Column({ type: 'jsonb', nullable: false })
  tags: string[] = [];

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({
    type: 'vector' as ColumnType,
    length: 1024,
    nullable: true,
    transformer: vectorTransformer,
  })
  embedding: number[] | null;
}
