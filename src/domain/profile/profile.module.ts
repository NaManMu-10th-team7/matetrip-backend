import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Users } from '../users/entities/users.entity';
import { BinaryContent } from '../binary-content/entities/binary-content.entity';
import { BinaryContentModule } from '../binary-content/binary-content.module';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { RabbitmqModule } from '../../infra/rabbitmq/rabbitmq.module.js';
import { MatchingService } from './matching.service';
import { Post } from '../post/entities/post.entity';
import { NovaService } from '../../ai/summaryLLM.service';
import { TitanEmbeddingService } from '../../ai/titan-embedding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, Users, BinaryContent, Post]),
    BinaryContentModule,
    RabbitmqModule,
  ],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    MatchingService,
    NovaService,
    TitanEmbeddingService,
  ],
  exports: [ProfileService, MatchingService, NovaService],
})
export class ProfileModule {}
