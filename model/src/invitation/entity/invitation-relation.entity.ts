import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'invitation_relation' })
@Unique(['inviterId', 'inviteeId'])
export class InvitationRelation {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  inviterId: number;

  @Column()
  inviteeId: number;

  @UpdateDateColumn()
  updatedAt?: Date;

  @CreateDateColumn()
  createdAt?: Date;
}
