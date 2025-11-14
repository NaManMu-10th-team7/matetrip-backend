import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaceService } from './place.service';
import { Place } from './entities/place.entity';
import { ProfileService } from '../profile/profile.service';
import { RegionGroup } from './entities/region_group.enum';
import { GetPlacesResDto } from './dto/get-places-res.dto';

describe('PlaceService - getPersonalizedPlaces', () => {
  let placeService: PlaceService;
  let placeRepo: jest.Mocked<Repository<Place>>;
  let profileService: jest.Mocked<ProfileService>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlaceService,
        {
          provide: getRepositoryToken(Place),
          useValue: {
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: ProfileService,
          useValue: {
            getUserEmbeddingValueByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    placeService = moduleRef.get(PlaceService);
    placeRepo = moduleRef.get(getRepositoryToken(Place));
    profileService = moduleRef.get(ProfileService);
  });

  describe('getPersonalizedPlaces', () => {
    const dto = {
      userId: 'user-1',
      region: RegionGroup.SEOUL,
    };

    it('throws when no embedding vector is found for the user', async () => {
      profileService.getUserEmbeddingValueByUserId.mockResolvedValue(undefined);

      await expect(placeService.getPersonalizedPlaces(dto)).rejects.toThrow(
        '임베딩 벡터를 찾을 수 없습니다.',
      );
      expect(placeRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('queries personalized places for the provided region using the user embedding', async () => {
      const embedding = [0.12, 0.42];
      const place: Place = {
        id: 'place-1',
        title: '한강공원',
        address: '서울시 마포구',
        region: RegionGroup.SEOUL,
        latitude: 37.527,
        longitude: 126.932,
        category: 'PARK',
        summary: '서울의 대표적인 수변공원',
        image_url: 'https://example.com/park.jpg',
        tags: [],
        embedding: embedding,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      } as Place;
      const expected = GetPlacesResDto.from(place);

      const queryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        setParameters: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([place]),
      };

      profileService.getUserEmbeddingValueByUserId.mockResolvedValue(embedding);
      placeRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await placeService.getPersonalizedPlaces(dto);

      expect(profileService.getUserEmbeddingValueByUserId).toHaveBeenCalledWith(
        dto.userId,
      );
      expect(placeRepo.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(queryBuilder.where).toHaveBeenCalledWith('p.region = :region', {
        region: dto.region,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'p.embedding <=> :embedding',
        'ASC',
      );
      expect(queryBuilder.setParameters).toHaveBeenCalledWith({
        embedding,
      });
      expect(queryBuilder.limit).toHaveBeenCalledWith(50);
      expect(queryBuilder.getMany).toHaveBeenCalled();
      expect(result).toEqual([expected]);
    });
  });
});
