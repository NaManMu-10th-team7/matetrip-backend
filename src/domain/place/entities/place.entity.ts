import { Column, Entity } from 'typeorm';
import type { ColumnType } from 'typeorm';
import { BaseTimestampEntity } from '../../base.entity.js';
import { vectorTransformer } from '../../../common/transformers/vector-transformer.js';
import { RegionGroup } from './region_group.enum.js';

@Entity('places')
export class Place extends BaseTimestampEntity {
  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  address: string;

  @Column({
    type: 'enum',
    name: 'region',
    enum: RegionGroup,
    enumName: 'region',
    nullable: true, // 임시로 true
  })
  region: RegionGroup;

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
