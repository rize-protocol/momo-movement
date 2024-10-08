import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { Admin, Public, Registration } from '@/common/decorators/auth.decorator';
import { CurrentTelegramId } from '@/common/decorators/current-user.decorator';
import { CreateUserInternalRequest } from '@/user/dto/create-user-internal.request';
import { CreateUserRequest } from '@/user/dto/create-user.request';
import { UserService } from '@/user/user.service';

@Controller('user')
export class UserController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly userService: UserService,
  ) {}

  @Registration()
  @Post('create')
  async createUser(@CurrentTelegramId() telegramId: string, @Body() request: CreateUserRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.userService.createUser(telegramId, request.referralCode ?? '', entityManager);
    });
  }

  @Public()
  @Get('info')
  async getTotalUser() {
    const total = await this.userService.getTotalUser();
    return { total };
  }

  @Admin()
  @Post('create_internal')
  async createUserInternal(@Body() request: CreateUserInternalRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.userService.createUserInternal(request.telegramId, request.referralCode ?? '', entityManager);
    });
  }
}
