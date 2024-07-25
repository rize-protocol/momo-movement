import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'invitation_code' })
export class InvitationCode {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  userId: number;

  @Column({ unique: true })
  code: string;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
