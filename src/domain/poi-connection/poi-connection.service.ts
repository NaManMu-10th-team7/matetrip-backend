import { Injectable } from '@nestjs/common';
import { CreatePoiConnectionDto } from './dto/create-poi-connection.dto';
import { UpdatePoiConnectionDto } from './dto/update-poi-connection.dto';

@Injectable()
export class PoiConnectionService {
  create(createPoiConnectionDto: CreatePoiConnectionDto) {
    return 'This action adds a new poiConnection';
  }

  findAll() {
    return `This action returns all poiConnection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} poiConnection`;
  }

  update(id: number, updatePoiConnectionDto: UpdatePoiConnectionDto) {
    return `This action updates a #${id} poiConnection`;
  }

  remove(id: number) {
    return `This action removes a #${id} poiConnection`;
  }
}
