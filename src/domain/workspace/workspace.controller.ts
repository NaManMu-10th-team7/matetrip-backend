import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkspaceService } from './service/workspace.service';
import { CreateWorkspaceReqDto } from './dto/create-workspace-req.dto';
import { AuthGuard } from '@nestjs/passport';
import { CreateReviewDto } from '../review/dto/create-review.dto';
import { ReviewService } from '../review/review.service';

@Controller('workspace')
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly reviewService: ReviewService,
  ) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceReqDto) {
    return this.workspaceService.create(createWorkspaceDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':workspaceId/reviews')
  createReview(
    @Param('workspaceId') workspaceId: string,
    @Body() createReviewDtos: CreateReviewDto[],
    @Req() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.reviewService.create(createReviewDtos, workspaceId, userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workspaceService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workspaceService.remove(id);
  }
}
