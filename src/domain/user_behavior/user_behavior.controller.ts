// import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
// import { UserBehaviorService } from './user_behavior.service';
// import { CreateUserBehaviorDto } from './dto/create-user_behavior.dto';
// import { UpdateUserBehaviorDto } from './dto/update-user_behavior.dto';

// @Controller('user-behavior')
// export class UserBehaviorController {
//   constructor(private readonly userBehaviorService: UserBehaviorService) {}

//   @Post()
//   create(@Body() createUserBehaviorDto: CreateUserBehaviorDto) {
//     return this.userBehaviorService.create(createUserBehaviorDto);
//   }

//   @Get()
//   findAll() {
//     return this.userBehaviorService.findAll();
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.userBehaviorService.findOne(+id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateUserBehaviorDto: UpdateUserBehaviorDto) {
//     return this.userBehaviorService.update(+id, updateUserBehaviorDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.userBehaviorService.remove(+id);
//   }
// }
