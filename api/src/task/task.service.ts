import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskProgress, User } from 'movement-gaming-model';
import { nanoid } from 'nanoid';
import { EntityManager } from 'typeorm';

import { TaskConfig, TaskItemConfig } from '@/common/config/types';
import { RedisService } from '@/common/services/redis.service';
import { checkBadRequest } from '@/common/utils/check';
import { GameService } from '@/game/game.service';
import { MomoService } from '@/momo/momo.service';
import { UserTaskItem } from '@/task/types';

@Injectable()
export class TaskService {
  private readonly taskList: TaskItemConfig[];

  private readonly redisLockTime = 10000; // 10s

  constructor(
    private readonly configService: ConfigService,
    private readonly gameService: GameService,
    private readonly momoService: MomoService,
    private readonly redisService: RedisService,
  ) {
    const taskConfig = this.configService.get<TaskConfig>('task');
    if (!taskConfig) {
      throw new Error('task config not found');
    }

    this.taskList = taskConfig.list;
  }

  async list(user: User, entityManager: EntityManager) {
    const taskProgress = await entityManager.findBy(TaskProgress, { userId: user.id! });
    return this.taskList.map((taskItem): UserTaskItem => {
      const exist = taskProgress.find((item) => item.taskId === taskItem.taskId && item.completed);
      return {
        task: taskItem,
        completed: !!exist,
      };
    });
  }

  async completeTask(user: User, taskId: number, entityManager: EntityManager) {
    const task = this.taskList.find((item) => item.taskId === taskId);
    checkBadRequest(!!task, 'task not exist');

    const redisLock = await this.redisService.acquireLock(`momo-task-${user.id!}`, this.redisLockTime);
    try {
      const exist = await entityManager.findOneBy(TaskProgress, { userId: user.id!, taskId });
      checkBadRequest(!exist, 'user has completed the task');

      if (task!.rewardPlays > 0) {
        await this.gameService.addExtraPlay(user, task!.rewardPlays, entityManager);
      }

      let uniId = '';
      if (task!.rewardCoins > 0) {
        uniId = nanoid();
        await this.momoService.taskBonus({ user, uniId, momoChange: task!.rewardCoins.toString() });
      }
      await entityManager.insert(TaskProgress, { userId: user.id!, taskId, completed: true });

      return uniId;
    } finally {
      await redisLock.release();
    }
  }
}
