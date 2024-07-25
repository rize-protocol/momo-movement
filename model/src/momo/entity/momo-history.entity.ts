import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'momo_history' })
export class MomoHistory {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  @Index()
  userId: number;

  @Column()
  telegramId: number;

  @Column()
  momoChange: string;

  @Column()
  module: string; // E.g. campaign, game

  @Column()
  message?: string; // E.g. Daily spin

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
