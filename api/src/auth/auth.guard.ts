import { CanActivate, ExecutionContext, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';

import { AuthService } from '@/auth/auth.service';
import { IS_PUBLIC_KEY, IS_REGISTRATION_KEY } from '@/common/decorators/auth.decorator';
import { UserService } from '@/user/user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private reflector: Reflector,
    private authService: AuthService,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    this.verifyTelegramInitData(request);

    if (this.isRegistration(context)) {
      return true;
    }

    request.user = await this.validateInitDataAuth(request);

    return true;
  }

  private isPublic(ctx: ExecutionContext) {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
  }

  private isRegistration(ctx: ExecutionContext) {
    return this.reflector.getAllAndOverride<boolean>(IS_REGISTRATION_KEY, [ctx.getHandler(), ctx.getClass]);
  }

  private async validateInitDataAuth(request: any) {
    this.verifyTelegramInitData(request);

    const telegramId = request.telegramId as number;
    const user = await this.userService.upsertUserByTelegramId(telegramId, this.entityManager);
    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  private verifyTelegramInitData(request: any) {
    const verified = this.authService.verifyTelegramInitData(request);
    if (!verified) {
      throw new UnauthorizedException();
    }

    const userInfo = this.authService.getTelegramUid(request) as string;
    const userInfoParsed = JSON.parse(userInfo);
    const telegramId = parseInt(userInfoParsed?.id ?? 0, 10);

    if (!telegramId || telegramId === 0) {
      throw new UnauthorizedException();
    }

    request.telegramId = telegramId;
  }
}