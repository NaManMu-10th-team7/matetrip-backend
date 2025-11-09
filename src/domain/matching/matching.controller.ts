import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchRequestDto } from './dto/match-request.dto';
import { SyncMatchingProfileDto } from './dto/sync-matching-profile.dto';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  searchMatches(@Body() matchRequestDto: MatchRequestDto) {
    return this.matchingService.findMatches(matchRequestDto);
  }

  //   메인 페이지에서 “추천 20명”을 보고 싶을 때 프론트는
  //   POST /matching/search 같은 API를 호출하면서 userId, limit(예:20)을 넘깁니다.
  // 백엔드는 내 임베딩 vs 다른 사용자 임베딩을 pgvector 거리로
  // 비교해서 유사도 순으로 정렬하고, 필요하면 성향/스타일 가중치를 추가 반영한 뒤
  // 상위 20명만 골라 matches 배열로 응답합니다.
  // 프론트는 전달받은 후보 목록을 그대로 화면에 렌더링합니다.
  // 벡터나 가중치 계산은 모두 서버 쪽에서 처리하므로, 프론트는 결과만 받으면 됩니다.

  @Post('profile/sync')
  @HttpCode(HttpStatus.OK)
  async syncProfile(@Body() dto: SyncMatchingProfileDto) {
    return this.matchingService.syncMatchingProfile(dto);
  }
}
