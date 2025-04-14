import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Event } from "./Event";

@Entity()
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  notificationId!: string;

  @Column()
  eventId!: string;

  @Column()
  type!: string;

  @Column({ type: "text" })
  content!: string;

  @ManyToOne(() => Event, event => event.notifications)
  @JoinColumn({ name: "eventId" })
  event!: Event;
}
