import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingProfile } from './entities/matching-profile.entity';
import { Users } from '../users/entities/users.entity';
import { NovaService } from '../../ai/summaryLLM.service';
import { TitanEmbeddingService } from '../../ai/titan-embedding.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([MatchingProfile, Users])],
  controllers: [MatchingController],
  providers: [MatchingService, NovaService, TitanEmbeddingService],
  exports: [MatchingService],
})
export class MatchingModule {}
