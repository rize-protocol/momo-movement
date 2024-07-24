import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'game_play' })
export class GamePlay {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  userId: number;

  @Column()
  telegramId: number;

  @Column()
  totalPlays: number;

  @Column()
  remainingPlays: number;

  @Column()
  lastReplenishmentTime: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
