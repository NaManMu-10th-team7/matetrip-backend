import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PostsPageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @IsInt()
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Max(100)
  @Min(1)
  @IsInt()
  limit: number = 10;
}
