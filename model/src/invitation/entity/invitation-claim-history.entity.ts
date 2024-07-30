import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'invitation_claim_history' })
export class InvitationClaimHistory {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  userId: number;

  @Column()
  telegramId: number;

  @Column({ unique: true })
  uniId: string;

  @Column()
  coinAmount: string;

  @Column()
  playAmount: number;

  @Column()
  extra: string;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
