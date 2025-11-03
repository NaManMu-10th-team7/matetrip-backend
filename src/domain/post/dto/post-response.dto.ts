import { Expose } from 'class-transformer';
import { IsUUID } from 'class-validator';

export class PostResponseDto {
  @Expose()
  @IsUUID()
  id: string;
  @Expose()
  createdAt: string;
  @Expose()
  title: string;
  @Expose()
  startDate: string;
  @Expose()
  endDate?: string | null;
}
