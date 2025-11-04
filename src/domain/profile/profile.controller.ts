import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  Delete,
  Req,
  UseGuards,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

type RequestWithUser = Request & { user: { id: string } };

// 인증된 요청인지 확인하고 user id가 없으면 요청을 거절하는 가드
class RequireUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    if (!req.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    return true;
  }
}

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

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
    return this.profileService.update(req.user.id, updateProfileDto);
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
