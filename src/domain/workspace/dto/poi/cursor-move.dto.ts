import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CursorPositionDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;
}

export class CursorMoveDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  position: CursorPositionDto;

  @IsString()
  @IsNotEmpty()
  userName: string;

  @IsString()
  @IsNotEmpty()
  userColor: string;
}
