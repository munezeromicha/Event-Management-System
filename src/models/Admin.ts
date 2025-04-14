import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Event } from "./Event";
import { Registration } from "./Registration";

@Entity()
export class Admin {
  @PrimaryGeneratedColumn("uuid")
  adminId!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @OneToMany(() => Event, event => event.admin)
  events!: Event[];

  @OneToMany(() => Registration, registration => registration.admin)
  registrations!: Registration[];
}
