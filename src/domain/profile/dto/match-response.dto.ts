import { TravelStyleType } from '../../profile/entities/travel-style-type.enum';
import { TendencyType } from '../../profile/entities/tendency-type.enum';
import { KeywordType } from '../../post/entities/keywords-type.enum';
import { MatchRequestDto } from './match-request.dto';
import { MBTI_TYPES } from '../../profile/entities/mbti.enum';

export class MatchRecruitingPostDto {
  id: string;
  title: string;
  location: string;
  startDate: string | null;
  endDate: string | null;
  maxParticipants: number;
  keywords: KeywordType[];
  imageId?: string; // Add imageId field
}

export class ProfileSummaryDto {
  nickname: string;
  // mbtiTypes: MBTI_TYPES | null;
  mannerTemperature?: number;
  profileImageId?: string | null;
}

export class MatchCandidateDto {
  userId: string;
  score: number;
  vectorScore: number;
  styleScore: number;
  tendencyScore: number;
  overlappingTravelStyles: TravelStyleType[];
  overlappingTendencies: TendencyType[];
  mbtiMatchScore: number;
  profile?: ProfileSummaryDto | null;
  recruitingPosts?: MatchRecruitingPostDto[];
  //profileImageId?: string; // Add profileImageId field
}

export class MatchResponseDto {
  query: MatchRequestDto;
  matches: MatchCandidateDto[];
}
