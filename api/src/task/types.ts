import { TaskItemConfig } from '@/common/config/types';

export interface UserTaskItem {
  task: TaskItemConfig;
  status: TaskStatus;
}

export enum TaskStatus {
  Initial = 'initial',
  Completed = 'completed',
  Rewarded = 'rewarded',
}
