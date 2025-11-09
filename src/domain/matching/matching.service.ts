import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchingProfile } from './entities/matching-profile.entity';
import { MatchRequestDto } from './dto/match-request.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { SyncMatchingProfileDto } from './dto/sync-matching-profile.dto';
import { Profile } from '../profile/entities/profile.entity';
import { NovaService } from '../../ai/summaryLLM.service';
import { TitanEmbeddingService } from '../../ai/titan-embedding.service';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(MatchingProfile)
    private readonly matchingProfileRepository: Repository<MatchingProfile>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    private readonly novaService: NovaService,
    private readonly titanEmbeddingService: TitanEmbeddingService,
  ) {}

  findMatches(matchRequestDto: MatchRequestDto): MatchResponseDto {
    return {
      query: matchRequestDto,
      matches: [],
    };
  }

  async syncMatchingProfile(dto: SyncMatchingProfileDto) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: dto.userId } }, // profile.user_id = dto.userId
      relations: ['user'], // user relation까지 같이 로드
    });
    if (!profile?.user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }
    const user = profile.user;
    // LLM이 description을 받고 1~2줄 요약을 해줌 = summary
    const summary = await this.novaService.summarizeDescription(
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
