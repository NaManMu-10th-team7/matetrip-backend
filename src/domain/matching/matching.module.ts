import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchingProfile } from './entities/matching-profile.entity';
import { Profile } from '../profile/entities/profile.entity';
import { NovaService } from '../../ai/summaryLLM.service';
import { TitanEmbeddingService } from '../../ai/titan-embedding.service';
import { Post } from '../post/entities/post.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([MatchingProfile, Profile, Post]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, NovaService, TitanEmbeddingService],
  exports: [MatchingService],
})
export class MatchingModule {}
