import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AddScheduleByPlaceReqDto {
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @IsUUID()
  @IsNotEmpty()
  placeId: string;

  @IsInt()
  @IsNotEmpty()
  dayNo: number; // 1-based day number
}
