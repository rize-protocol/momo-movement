import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'game_play' })
export class GamePlay {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  userId: number;

  @Column()
  telegramId: string;

  @Column()
  totalPlays: number;

  @Column()
  remainingPlays: number;

  @Column()
  extraPlays: number;

  @Column()
  lastReplenishmentTime: Date;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
