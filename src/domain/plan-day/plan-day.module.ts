import { Module } from '@nestjs/common';
import { PlanDayService } from './plan-day.service';
import { PlanDayController } from './plan-day.controller';

@Module({
  controllers: [PlanDayController],
  providers: [PlanDayService],
})
export class PlanDayModule {}
