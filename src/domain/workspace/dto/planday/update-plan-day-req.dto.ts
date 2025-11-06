import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanDayReqDto } from './create-plan-day-req.dto';

export class UpdatePlanDayReqDto extends PartialType(CreatePlanDayReqDto) {}
