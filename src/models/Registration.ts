import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne, JoinColumn } from "typeorm";
import { Event } from "./Event";
import { Badge } from "./Badge";
import { FinancialSupport } from "./FinancialSupport";
import { Admin } from "./Admin";
import { Attendance } from "./Attendance";

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

  @Column({ nullable: true })
  nationalId?: string;

  @Column({ nullable: true })
  passport?: string;

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

  @OneToOne(() => Badge, badge => badge.registration)
  badge!: Badge;

  @OneToOne(() => FinancialSupport, financialSupport => financialSupport.registration)
  financialSupport!: FinancialSupport;

  @ManyToOne(() => Admin, admin => admin.registrations)
  @JoinColumn({ name: "adminId" })
  admin!: Admin;

  @OneToMany(() => Attendance, attendance => attendance.registration)
  attendances!: Attendance[];
}
