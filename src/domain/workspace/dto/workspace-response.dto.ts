import { Expose } from 'class-transformer';

export class WorkspaceResponseDto {
  @Expose()
  id: string;
  @Expose()
  workspaceName: string;
}
