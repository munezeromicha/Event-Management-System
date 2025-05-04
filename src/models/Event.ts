import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Admin } from "./Admin";
import { Registration } from "./Registration";
import { Notification } from "./Notification";
import { Attendance } from "./Attendance";

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  eventId!: string;

  @Column()
  name!: string;

  @Column()
  eventType!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  dateTime!: Date;

  @Column()
  location!: string;

  @Column({ type: "text" })
  description!: string;

  @Column()
  maxCapacity!: number;

  @Column()
  financialSupportOption!: boolean;

  @ManyToOne(() => Admin, admin => admin.events)
  @JoinColumn({ name: "adminId" })
  admin!: Admin;

  @OneToMany(() => Registration, registration => registration.event)
  registrations!: Registration[];

  @OneToMany(() => Notification, notification => notification.event)
  notifications!: Notification[];

  @OneToMany(() => Attendance, attendance => attendance.event)
  attendances!: Attendance[];
}
