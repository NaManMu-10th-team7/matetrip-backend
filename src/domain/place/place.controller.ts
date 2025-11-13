import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlaceService } from './place.service';
import { GetPlacesInboundsReqDto } from './dto/get-places-inbounds-req.dto.js';
import { GetPlacesInboundsResDto } from './dto/get-places-inbounds-res.dto.js';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Get()
  getPlacesInBounds(
    @Query() dto: GetPlacesInboundsReqDto,
  ): Promise<GetPlacesInboundsResDto[]> {
    console.log('dto', dto);
    return this.placeService.getPlacesInBounds(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placeService.findOne(+id);
  }
}
