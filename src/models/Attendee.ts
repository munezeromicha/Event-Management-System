import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Registration } from "./Registration";

@Entity()
export class Attendee {
  @PrimaryGeneratedColumn("uuid")
  attendeeId!: string;

  @Column()
  fullName!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  nationalId!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  organization!: string;

  @OneToMany(() => Registration, registration => registration.attendee)
  registrations!: Registration[];
}
