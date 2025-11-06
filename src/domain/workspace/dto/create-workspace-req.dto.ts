import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateWorkspaceReqDto {
  @IsUUID()
  @IsNotEmpty()
  postId: string;

  @IsNotEmpty()
  workspaceName: string;

  // baseLongitude: number;
  // baseLatitude: number;
}
