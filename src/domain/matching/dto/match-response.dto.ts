import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
import { TendencyType } from '../../profile/entities/tendency-type.enum';
import { MatchRequestDto } from './match-request.dto';

export class MatchCandidateDto {
  userId: string;
  score: number;
  overlappingTravelTendencyTypes: TravelStyleType[];
  overlappingTravelTendencies: TendencyType[];
  mbtiMatchScore: number;
}

export class MatchResponseDto {
  query: MatchRequestDto;
  matches: MatchCandidateDto[];
}
