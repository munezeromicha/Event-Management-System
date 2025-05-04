import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CreateAttendanceTable1713371234567 implements MigrationInterface {
    name = 'CreateAttendanceTable1713371234567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, drop the existing table and all its dependencies
        await queryRunner.query(`DROP TABLE IF EXISTS "attendance" CASCADE;`);

        // Then create the new table with the correct structure
        await queryRunner.query(`
            CREATE TABLE "attendance" (
                "attendanceId" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "fullName" character varying NOT NULL,
                "checkInTime" TIMESTAMP NOT NULL DEFAULT now(),
                "bankAccountNumber" character varying,
                "registrationId" uuid,
                "eventId" uuid,
                "nationalId" character varying,
                "phoneNumber" character varying,
                "email" character varying,
                "organization" character varying,
                CONSTRAINT "PK_attendance" PRIMARY KEY ("attendanceId")
            )
        `);

        // Add the foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "attendance"
            ADD CONSTRAINT "FK_attendance_registration"
            FOREIGN KEY ("registrationId")
            REFERENCES "registration"("registrationId")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "attendance"
            ADD CONSTRAINT "FK_attendance_event"
            FOREIGN KEY ("eventId")
            REFERENCES "event"("eventId")
            ON DELETE CASCADE
        `);

        // Add indexes for faster lookups
        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_REGISTRATION",
            columnNames: ["registrationId"]
        }));

        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_EVENT",
            columnNames: ["eventId"]
        }));

        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_CHECKIN",
            columnNames: ["checkInTime"]
        }));

        // Add composite index for common query patterns
        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_REG_EVENT",
            columnNames: ["registrationId", "eventId"]
        }));

        // Remove the old attendanceTime column from registration
        await queryRunner.query(`
            ALTER TABLE "registration"
            DROP COLUMN IF EXISTS "attendanceTime"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_REGISTRATION");
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_EVENT");
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_CHECKIN");
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_REG_EVENT");

        // Drop the table and all its dependencies
        await queryRunner.query(`DROP TABLE IF EXISTS "attendance" CASCADE;`);

        // Add back the attendanceTime column to registration
        await queryRunner.query(`
            ALTER TABLE "registration"
            ADD COLUMN IF NOT EXISTS "attendanceTime" TIMESTAMP
        `);
    }
} 