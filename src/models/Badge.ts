import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Registration } from "./Registration";

@Entity()
export class Badge {
  @PrimaryGeneratedColumn("uuid")
  badgeId!: string;

  @Column()
  registrationId!: string;

  @Column({ nullable: true })
  qrCode!: string;

  @Column({ nullable: true })
  badgeUrl!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToOne(() => Registration, registration => registration.badge)
  @JoinColumn({ name: "registrationId" })
  registration!: Registration;
}
