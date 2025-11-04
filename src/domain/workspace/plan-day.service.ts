import { Injectable } from '@nestjs/common';
import { Workspace } from './entities/workspace.entity.js';
import { PlanDay } from './entities/plan-day.entity.js';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PlanDayService {
  constructor(
    @InjectRepository(PlanDay)
    private readonly planDayRepository: Repository<PlanDay>,
  ) {}

  createPlanDays(
    workspace: Workspace,
    startDate?: string,
    endDate?: string | null,
  ): PlanDay[] {
    if (!startDate && !endDate) return [];
    if (!startDate || !endDate) return [];

    const start = parseISO(startDate);
    const end = parseISO(endDate);

    const days = eachDayOfInterval({ start, end });

    return days.map((date, i) =>
      this.planDayRepository.create({
        dayNo: i + 1,
        planDate: format(date, 'yyyy-MM-dd'),
        workspace,
      }),
    );
  }

  async getWorkspacePlanDays(workspaceId: string): Promise<PlanDay[]> {
    return await this.planDayRepository.find({
      where: {
        workspace: {
          id: workspaceId,
        } as Workspace,
      },
    });
  }
}
