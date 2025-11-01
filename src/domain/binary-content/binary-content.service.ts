import { Injectable } from '@nestjs/common';
import { CreateBinaryContentDto } from './dto/create-binary-content.dto';
import { UpdateBinaryContentDto } from './dto/update-binary-content.dto';

@Injectable()
export class BinaryContentService {
  create(createBinaryContentDto: CreateBinaryContentDto) {
    return 'This action adds a new binaryContent';
  }

  findAll() {
    return `This action returns all binaryContent`;
  }

  findOne(id: number) {
    return `This action returns a #${id} binaryContent`;
  }

  update(id: number, updateBinaryContentDto: UpdateBinaryContentDto) {
    return `This action updates a #${id} binaryContent`;
  }

  remove(id: number) {
    return `This action removes a #${id} binaryContent`;
  }
}
