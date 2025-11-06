import { Expose } from 'class-transformer';

export class WorkspaceResDto {
  @Expose()
  id: string;
  @Expose()
  workspaceName: string;
}
