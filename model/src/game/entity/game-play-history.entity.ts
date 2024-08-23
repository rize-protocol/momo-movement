import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'game_play_history' })
export class GamePlayHistory {
  @PrimaryGeneratedColumn()
  id?: number;

  @Index()
  @Column()
  userId: number;

  @Column()
  telegramId: string;

  @Column()
  uniIds: string;

  @Column()
  coinAmount: string;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
