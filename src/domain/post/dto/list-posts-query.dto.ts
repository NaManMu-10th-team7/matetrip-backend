import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PostsPageQueryDto {
  @Type(() => Number)
  @Min(1)
  @IsInt()
  page: number = 1;

  @Type(() => Number)
  @Min(1)
  @IsInt()
  limit: number = 10;
}
