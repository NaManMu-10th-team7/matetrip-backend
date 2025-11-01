import { Injectable } from '@nestjs/common';
import { CreatePlanDayDto } from './dto/create-plan-day.dto';
import { UpdatePlanDayDto } from './dto/update-plan-day.dto';

@Injectable()
export class PlanDayService {
  create(createPlanDayDto: CreatePlanDayDto) {
    return 'This action adds a new planDay';
  }

  findAll() {
    return `This action returns all planDay`;
  }

  findOne(id: number) {
    return `This action returns a #${id} planDay`;
  }

  update(id: number, updatePlanDayDto: UpdatePlanDayDto) {
    return `This action updates a #${id} planDay`;
  }

  remove(id: number) {
    return `This action removes a #${id} planDay`;
  }
}
