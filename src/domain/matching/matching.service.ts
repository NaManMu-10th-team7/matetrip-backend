import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchingProfile } from './entities/matching-profile.entity';
import { MatchRequestDto } from './dto/match-request.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { SyncMatchingProfileDto } from './dto/sync-matching-profile.dto';
import { Users } from '../users/entities/users.entity';
import { GeminiService } from '../../ai/summaryLLM.service';
import { TitanEmbeddingService } from '../../ai/titan-embedding.service';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(MatchingProfile)
    private readonly matchingProfileRepository: Repository<MatchingProfile>,
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly geminiService: GeminiService,
    private readonly titanEmbeddingService: TitanEmbeddingService,
  ) {}

  findMatches(matchRequestDto: MatchRequestDto): MatchResponseDto {
    return {
      query: matchRequestDto,
      matches: [],
    };
  }

  async syncMatchingProfile(dto: SyncMatchingProfileDto) {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    // LLM이 description을 받고 1~2줄 요약을 해줌 = summary
    const summary = await this.geminiService.summarizeDescription(
      dto.description,
    );
    const matchingProfile = // 인스턴스 생성(이미 있으면 내용 추가, 아니면 생성)
      (await this.matchingProfileRepository.findOne({
        where: { user: { id: dto.userId } },
        relations: ['user'],
      })) ?? this.matchingProfileRepository.create({ user });
    // matching_profile 정보 넣기
    matchingProfile.profileDetail = dto.description;
    matchingProfile.profileSummary = summary;
    matchingProfile.travelTendencyTypes = dto.travelTendencyTypes ?? [];
    matchingProfile.travelTendencies = dto.travelTendencies ?? [];
    matchingProfile.profileEmbedding =
      (await this.titanEmbeddingService.embedText(
        summary || dto.description,
      )) ?? null;
    // 요약이 있으면 그걸 먼저 쓰고, 요약이 비어 있으면 원본 description으로 폴백

    return this.matchingProfileRepository.save(matchingProfile);
    // 실제 DB에 이 레코드 반영 (INSERT or UPDATE)
  }
}
