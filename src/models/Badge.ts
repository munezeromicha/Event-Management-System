import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Registration } from "./Registration";

@Entity()
export class Badge {
  @PrimaryGeneratedColumn("uuid")
  badgeId!: string;

  @Column()
  registrationId!: string;

  @Column()
  qrCode!: string;

  @OneToOne(() => Registration, registration => registration.badge)
  @JoinColumn({ name: "registrationId" })
  registration!: Registration;
}
