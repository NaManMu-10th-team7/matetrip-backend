import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
import { TendencyType } from '../../profile/entities/tendency-type.enum';
import { KeywordType } from '../../post/entities/keywords-type.enum';
import { MatchRequestDto } from './match-request.dto';

export class MatchRecruitingPostDto {
  id: string;
  title: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  maxParticipants: number;
  keywords: KeywordType[];
}

export class MatchCandidateDto {
  userId: string;
  score: number;
  vectorScore: number;
  styleScore: number;
  tendencyScore: number;
  overlappingTravelTendencyTypes: TravelStyleType[];
  overlappingTravelTendencies: TendencyType[];
  mbtiMatchScore: number;
  recruitingPost?: MatchRecruitingPostDto | null;
}

export class MatchResponseDto {
  query: MatchRequestDto;
  matches: MatchCandidateDto[];
}
