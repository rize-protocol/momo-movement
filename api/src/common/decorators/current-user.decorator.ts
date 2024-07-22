import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTelegramId = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request.telegramId;
});

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest();
  return request.user;
});
