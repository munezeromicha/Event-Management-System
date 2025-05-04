import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { Registration } from "./Registration";
import { Event } from "./Event";

@Entity()
@Index(["registrationId", "eventId"], { unique: true })
@Index(["eventId"])
export class Attendance {
  @PrimaryGeneratedColumn("uuid")
  attendanceId!: string;

  @Column()
  fullName!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  checkInTime!: Date;

  @Column({ nullable: true })
  bankAccountNumber!: string;
  
  @Column({ nullable: true })
  bankName!: string;

  @Column()
  registrationId!: string;  // Add direct column for faster queries

  @Column()
  eventId!: string;  // Add direct column for faster queries

  @Column({ nullable: true })
  nationalId!: string;

  @Column({ nullable: true })
  phoneNumber!: string;

  @Column({ nullable: true })
  email!: string;

  @Column({ nullable: true })
  organization!: string;

  @ManyToOne(() => Registration)
  @JoinColumn({ name: "registrationId" })
  registration!: Registration;

  @ManyToOne(() => Event, event => event.attendances)
  @JoinColumn({ name: "eventId" })
  event!: Event;
}