import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'game_play_history' })
export class GamePlayHistory {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  userId: number;

  @Column()
  telegramId: number;

  @Column()
  coinAmount: string;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
