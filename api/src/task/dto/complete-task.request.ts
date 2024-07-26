import { IsNumber } from 'class-validator';

export class CompleteTaskRequest {
  @IsNumber()
  taskId: number;
}
