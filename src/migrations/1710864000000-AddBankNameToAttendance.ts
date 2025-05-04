import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBankNameToAttendance1710864000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "attendance"
            ADD COLUMN "bankName" character varying;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "attendance"
            DROP COLUMN "bankName";
        `);
    }
} 