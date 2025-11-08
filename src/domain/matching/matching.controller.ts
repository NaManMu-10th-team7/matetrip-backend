import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchRequestDto } from './dto/match-request.dto';

@Controller('matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchMatches(@Body() matchRequestDto: MatchRequestDto) {
    return this.matchingService.findMatches(matchRequestDto);
  }
}
