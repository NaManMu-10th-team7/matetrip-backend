import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BinaryContentService } from './binary-content.service';
import { CreateBinaryContentDto } from './dto/create-binary-content.dto';
import { UpdateBinaryContentDto } from './dto/update-binary-content.dto';

@Controller('binary-content')
export class BinaryContentController {
  constructor(private readonly binaryContentService: BinaryContentService) {}

  @Post()
  create(@Body() createBinaryContentDto: CreateBinaryContentDto) {
    return this.binaryContentService.create(createBinaryContentDto);
  }

  @Get()
  findAll() {
    return this.binaryContentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.binaryContentService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBinaryContentDto: UpdateBinaryContentDto,
  ) {
    return this.binaryContentService.update(+id, updateBinaryContentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.binaryContentService.remove(+id);
  }
}
