import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BinaryContent } from './entities/binary-content.entity';
import { CreateBinaryContentDto } from './dto/create-binary-content.dto';
import { UpdateBinaryContentDto } from './dto/update-binary-content.dto';

@Injectable()
export class BinaryContentService {
  constructor(
    @InjectRepository(BinaryContent)
    private readonly binaryContentRepository: Repository<BinaryContent>,
  ) {}

  async create(
    createBinaryContentDto: CreateBinaryContentDto,
  ): Promise<BinaryContent> {
    const entity = this.binaryContentRepository.create(createBinaryContentDto);
    return this.binaryContentRepository.save(entity);
  }

  async findAll(): Promise<BinaryContent[]> {
    return await this.binaryContentRepository.find();
  }

  async findOne(id: string): Promise<BinaryContent> {
    const content = await this.binaryContentRepository.findOne({
      where: { id },
    });

    if (!content) {
      throw new NotFoundException(`BinaryContent with ID ${id} not found`);
    }

    return content;
  }

  async update(
    id: string,
    updateBinaryContentDto: UpdateBinaryContentDto,
  ): Promise<BinaryContent> {
    const content = await this.findOne(id);

    Object.assign(content, updateBinaryContentDto);
    return this.binaryContentRepository.save(content);
  }

  async remove(id: string): Promise<void> {
    const content = await this.findOne(id);

    await this.binaryContentRepository.remove(content);
  }
}
