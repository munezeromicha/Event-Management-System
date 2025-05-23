import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Staff {
  @PrimaryGeneratedColumn("uuid")
  staffId!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({ default: "staff" })
  role!: string;

  @Column({ nullable: true })
  fullName?: string;

  @Column({ nullable: true })
  email?: string;
} 