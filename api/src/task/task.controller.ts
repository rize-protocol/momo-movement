import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { User } from 'movement-gaming-model';
import { EntityManager } from 'typeorm';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CompleteTaskRequest } from '@/task/dto/complete-task.request';
import { TaskService } from '@/task/task.service';

@Controller('task')
export class TaskController {
  constructor(
    @InjectEntityManager() private readonly entityManager: EntityManager,
    private readonly taskService: TaskService,
  ) {}

  @Get('list')
  async list(@CurrentUser() user: User) {
    return this.taskService.list(user, this.entityManager);
  }

  @Post('complete')
  async complete(@CurrentUser() user: User, @Body() request: CompleteTaskRequest) {
    await this.entityManager.transaction(async (entityManager) => {
      await this.taskService.completeTask(user, request.taskId, entityManager);
    });
  }
}
