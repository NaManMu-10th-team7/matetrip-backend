import { Expose } from 'class-transformer';

export class PlanDayResDto {
  @Expose()
  id: string;
  @Expose()
  day_no: number;
  @Expose()
  plan_date: string;
}
