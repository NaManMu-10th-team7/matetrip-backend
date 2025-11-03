import { IsNotEmpty, IsUUID } from 'class-validator';

export class PoiSocketDto {
  @IsUUID()
  @IsNotEmpty()
  workSpaceId: string;
}
