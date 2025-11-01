import { Column, Entity } from 'typeorm';
import { BaseTimestampEntity } from '../../../base.entity';

@Entity('binary_content', { schema: 'public' })
export class BinaryContent extends BaseTimestampEntity {
  @Column({ type: 'text', name: 'file_name' })
  fileName: string;

  @Column({ type: 'text', name: 'file_type' })
  fileType: string;

  @Column({ type: 'bigint', name: 'file_size' })
  fileSize: string;
}
