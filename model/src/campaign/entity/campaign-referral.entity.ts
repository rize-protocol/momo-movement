import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'campaign_referral' })
export class CampaignReferral {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  referralCode: string;

  @Column('text')
  extra: string;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
