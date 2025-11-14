import { EmbeddingMatchingProfileDto } from '../dto/embedding-matching-profile.dto';
import { TravelStyleType } from '../entities/travel-style-type.enum';
import { TendencyType } from '../entities/tendency-type.enum';

export interface EmbeddingPayloadSource {
  description?: string | null;
  travelStyles?: TravelStyleType[] | null;
  tendency?: TendencyType[] | null;
}

export function buildEmbeddingPayloadFromSource(
  source?: EmbeddingPayloadSource | null,
): EmbeddingMatchingProfileDto {
  const payload: EmbeddingMatchingProfileDto = {};
  if (!source) {
    return payload;
  }

  const description = source.description?.trim() || '';
  if (description) {
    payload.description = description;
  }

  if (source.travelStyles?.length) {
    payload.travelTendencyTypes = source.travelStyles;
  }

  if (source.tendency?.length) {
    payload.travelTendencies = source.tendency;
  }

  return payload;
}
