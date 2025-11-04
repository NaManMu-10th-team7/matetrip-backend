import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PoiConnection } from '../entities/poi-connection.entity.js';
import { PoiConnectionCacheService } from './poi-connection-cache.service.js';

@Injectable()
export class PoiConnectionService {
  private readonly logger = new Logger(PoiConnectionService.name);
  private readonly ttlSeconds = 60 * 60 * 24; // 24 hours

  constructor(
    @InjectRepository(PoiConnection)
    private readonly poiConnectionRepository: Repository<PoiConnection>,
    private readonly poiConnectionCacheService: PoiConnectionCacheService,
  ) {}

  findAll() {
    return `This action returns all poiConnection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} poiConnection`;
  }

  async removePoiConnection(id: string): Promise<string> {
    const deleteResult = await this.poiConnectionRepository.delete({
      id: id,
    });
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`POI Connection with id ${id} not found`);
    }

    await this.poiConnectionCacheService.removePoiConnection(id);
    return id;
  }
}
