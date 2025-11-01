import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PoiService } from './poi.service';
import { CreatePoiDto } from './dto/create-poi.dto';
import { UpdatePoiDto } from './dto/update-poi.dto';

@Controller('poi')
export class PoiController {
  constructor(private readonly poiService: PoiService) {}

  @Post()
  create(@Body() createPoiDto: CreatePoiDto) {
    return this.poiService.create(createPoiDto);
  }

  @Get()
  findAll() {
    return this.poiService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.poiService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePoiDto: UpdatePoiDto) {
    return this.poiService.update(+id, updatePoiDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.poiService.remove(+id);
  }
}
