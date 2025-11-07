import { IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreatePoiConnectionReqDto {
  @IsUUID()
  workspaceId: string;

  @IsUUID()
  prevPoiId: string;

  @IsUUID()
  nextPoiId: string;

  @IsNotEmpty()
  @IsUUID()
  planDayId: string;

  @IsOptional()
  @IsInt()
  distance?: number = 0;

  @IsOptional()
  @IsInt()
  duration?: number = 0;
}
