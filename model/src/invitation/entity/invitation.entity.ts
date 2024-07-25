import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'invitation' })
export class Invitation {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  userId: number;

  @Column()
  inviteCount: number;

  @Column()
  checkedLevel: number;

  @Column()
  unCheckedLevel: number;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
