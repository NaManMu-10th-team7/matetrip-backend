import { Module } from '@nestjs/common';
import { PostParticipationService } from './post-participation.service';
import { PostParticipationController } from './post-participation.controller';

@Module({
  controllers: [PostParticipationController],
  providers: [PostParticipationService],
})
export class PostParticipationModule {}
