import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { MatchingService } from './matching.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MatchRequestDto } from './dto/match-request.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

type RequestWithUser = Request & { user: { id: string } };

@Controller('profile')
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly matchingService: MatchingService,
  ) {}

  @Get('my')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(@Req() req: RequestWithUser) {
    const userId = req.user.id;

    return this.profileService.getProfileByUserId(userId);
  }

  /**
   * 로그인 시 유저 정보를 가져와서 전역 상태로 관리하기 위함.
   * @param req
   */
  @Get('my/info')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async getMyProfileWithUserId(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    const profile = await this.profileService.getProfileByUserId(userId);
    return {
      userId,
      profile,
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.profileService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profileService.findOne(id);
  }

  @Get('user/:userId')
  @HttpCode(HttpStatus.OK)
  async findProfileByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.profileService.getProfileByUserId(userId);
  }

  @Patch('my')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async update(
    @Req() req: RequestWithUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    Logger.log(updateProfileDto, 'ProfileController');
    //변경사항 저장 + 임베딩까지 진행(상세소개, 여행성향 , 여행 스타일 변경되었을때만)
    return this.profileService.update(req.user.id, updateProfileDto);
  }

  // 유사도 몇명 뽑아오는거
  @Post('matching/search')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  searchMatches(
    @Req() req: RequestWithUser,
    @Body() matchRequestDto: MatchRequestDto,
  ) {
    return this.matchingService.findMatches(req.user.id, matchRequestDto);
  }

  // // //JWT 일때로 가정
  // @Delete(':id')
  // @HttpCode(HttpStatus.OK)
  // @UseGuards(RequireUserGuard)
  // remove(
  //   @Param('id', new ParseUUIDPipe()) id: string,
  //   @Req() req: RequestWithUser,
  // ) {
  //   return this.profileService.remove(id, req.user.id);
  // }
}
