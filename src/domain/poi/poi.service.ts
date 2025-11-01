import { Injectable } from '@nestjs/common';
import { CreatePoiDto } from './dto/create-poi.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';

@Injectable()
export class PoiService {
  create(createPoiDto: CreatePoiDto) {
    return 'This action adds a new poi';
  }

  findAll() {
    return `This action returns all poi`;
  }

  findOne(id: number) {
    return `This action returns a #${id} poi`;
  }

  update(id: number, updatePoiDto: UpdatePoiDto) {
    return `This action updates a #${id} poi`;
  }

  remove(id: number) {
    return `This action removes a #${id} poi`;
  }
}
