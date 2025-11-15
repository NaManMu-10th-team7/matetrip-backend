import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class WorkspaceResDto {
  @Expose()
  id: string;
  @Expose()
  workspaceName: string;
}

export class PlanReqDto {
  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;
}
