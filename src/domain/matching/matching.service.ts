import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchingProfile } from './entities/matching-profile.entity';
import { MatchRequestDto } from './dto/match-request.dto';
import { MatchResponseDto } from './dto/match-response.dto';

@Injectable()
export class MatchingService {
  constructor(
    @InjectRepository(MatchingProfile)
    private readonly matchingProfileRepository: Repository<MatchingProfile>,
  ) {}

  async findMatches(matchRequestDto: MatchRequestDto): Promise<MatchResponseDto> {
    // TODO: replace with actual similarity search against pgvector
    return {
      query: matchRequestDto,
      matches: [],
    };
  }
}
