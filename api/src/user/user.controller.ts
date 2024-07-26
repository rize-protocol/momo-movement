import { Body, Controller, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { Registration } from '@/common/decorators/auth.decorator';
import { CurrentTelegramId } from '@/common/decorators/current-user.decorator';
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
  async createUser(@CurrentTelegramId() telegramId: number, @Body() request: CreateUserRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.userService.createUser(telegramId, request.referralCode ?? '', entityManager);
    });
  }
}
