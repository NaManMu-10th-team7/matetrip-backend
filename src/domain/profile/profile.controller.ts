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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Request } from 'express';

type RequestWithUser = Request & { user: { id: string } };

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
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

  // @Patch(':id')
  // @HttpCode(HttpStatus.OK)
  // update(
  //   @Param('id', new ParseUUIDPipe()) id: string,
  //   @Body() updateProfileDto: UpdateProfileDto,
  // ) {
  //   return this.profileService.update(id, updateProfileDto);
  // }

  // //JWT 일때로 가정
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: RequestWithUser,
  ) {
    updateProfileDto.userId = req.user.id;
    return this.profileService.update(id, updateProfileDto);
  }

  // //JWT 일때로 가정
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: RequestWithUser,
  ) {
    return this.profileService.remove(id, req.user.id);
  }

  // @Delete(':id')
  // @HttpCode(HttpStatus.OK)
  // remove(@Param('id', new ParseUUIDPipe()) id: string) {
  //   return this.profileService.remove(id);
  // }
}
