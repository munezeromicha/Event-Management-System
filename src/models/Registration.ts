import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { Event } from "./Event";
import { Attendee } from "./Attendee";
import { Badge } from "./Badge";
import { FinancialSupport } from "./FinancialSupport";
import { Admin } from "./Admin";

@Entity()
export class Registration {
  @PrimaryGeneratedColumn("uuid")
  registrationId!: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  registrationDate!: Date;

  @Column({ default: "pending" })
  status!: string;

  @Column()
  fullName!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  nationalId!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  organization?: string;

  @Column({ nullable: true })
  approvalDate?: Date;

  @Column({ nullable: true })
  approvedBy?: string;

  @Column({ type: "timestamp", nullable: true })
  attendanceTime?: Date;

  @ManyToOne(() => Event, event => event.registrations)
  @JoinColumn({ name: "eventId" })
  event!: Event;

  @ManyToOne(() => Attendee, attendee => attendee.registrations)
  @JoinColumn({ name: "attendeeId" })
  attendee!: Attendee;

  @OneToOne(() => Badge, badge => badge.registration)
  badge!: Badge;

  @OneToOne(() => FinancialSupport, financialSupport => financialSupport.registration)
  financialSupport!: FinancialSupport;

  @ManyToOne(() => Admin, admin => admin.registrations)
  @JoinColumn({ name: "adminId" })
  admin!: Admin;
}
