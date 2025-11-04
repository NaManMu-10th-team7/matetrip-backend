import { IsInt, IsOptional, IsUUID } from 'class-validator';

export class CreatePoiConnectionDto {
  @IsUUID()
  prevPoiId: string;

  @IsUUID()
  nextPoiId: string;

  @IsUUID()
  planDayId: string;

  @IsOptional()
  @IsInt()
  distance?: number = 0;

  @IsOptional()
  @IsInt()
  duration?: number = 0;
}
