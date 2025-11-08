import { Expose } from 'class-transformer';

export class NotificationEventDto {
  @Expose()
  id: string;

  @Expose()
  content: string;
}
