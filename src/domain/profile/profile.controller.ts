import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

type RequestWithUser = Request & { user: { id: string } };

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('my')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async getMyProfile(@Req() req: RequestWithUser) {
    return this.profileService.getProfileByUserId(req.user.id);
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
    return this.profileService.update(req.user.id, updateProfileDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.profileService.remove(id, req.user.id);
  }
}
