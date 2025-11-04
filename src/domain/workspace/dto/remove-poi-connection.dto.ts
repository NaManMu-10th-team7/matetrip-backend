import { IsNotEmpty, IsUUID } from 'class-validator';

export class RemovePoiConnectionDto {
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @IsNotEmpty()
  @IsUUID()
  planDayId: string;
}
