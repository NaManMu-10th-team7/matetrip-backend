import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PoiConnectionService } from './poi-connection.service';
import { CreatePoiConnectionDto } from './dto/create-poi-connection.dto';
import { UpdatePoiConnectionDto } from './dto/update-poi-connection.dto';

@Controller('poi-connection')
export class PoiConnectionController {
  constructor(private readonly poiConnectionService: PoiConnectionService) {}

  @Post()
  create(@Body() createPoiConnectionDto: CreatePoiConnectionDto) {
    return this.poiConnectionService.create(createPoiConnectionDto);
  }

  @Get()
  findAll() {
    return this.poiConnectionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.poiConnectionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePoiConnectionDto: UpdatePoiConnectionDto,
  ) {
    return this.poiConnectionService.update(+id, updatePoiConnectionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.poiConnectionService.remove(+id);
  }
}
