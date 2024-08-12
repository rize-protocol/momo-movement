import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'campaign_galxe' })
export class CampaignGalxe {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  userId: number;

  @Column({ unique: true })
  telegramId: string;

  @Column({ unique: true })
  evmAddress: string;

  @Column('text')
  extra: string;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
