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

  @Column({ type: 'text', name: 's3_key', unique: true })
  s3Key: string; //  S3 버킷 내 고유 키 (파일 삭제/관리에 사용)

  @Column({ type: 'text', name: 'url' })
  url: string; //  S3에 저장된 파일의 전체 URL (클라이언트 조회용)
}
