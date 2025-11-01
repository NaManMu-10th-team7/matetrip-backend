import { Expose } from 'class-transformer';

export class PostResponseDto {
  @Expose()
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
