import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm";
import { Registration } from "./Registration";

@Entity()
export class FinancialSupport {
  @PrimaryGeneratedColumn("uuid")
  financialSupportId!: string;

  @Column()
  registrationId!: string;

  @Column()
  bankAccountNumber!: string;

  @OneToOne(() => Registration, registration => registration.financialSupport)
  @JoinColumn({ name: "registrationId" })
  registration!: Registration;
}
