import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PoiHoverReqDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional() // poiId는 호버가 끝났을 때 null일 수 있음
  poiId: string | null;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
