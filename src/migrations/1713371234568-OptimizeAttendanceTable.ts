import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class OptimizeAttendanceTable1713371234568 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop existing foreign key constraints to avoid issues
        await queryRunner.query(`
            ALTER TABLE "attendance" 
            DROP CONSTRAINT IF EXISTS "FK_attendance_registration"
        `);

        await queryRunner.query(`
            ALTER TABLE "attendance" 
            DROP CONSTRAINT IF EXISTS "FK_attendance_event"
        `);

        // Add new columns if they don't exist
        await queryRunner.query(`
            ALTER TABLE "attendance" 
            ADD COLUMN IF NOT EXISTS "nationalId" character varying,
            ADD COLUMN IF NOT EXISTS "phoneNumber" character varying
        `);

        // Create optimized indexes
        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_REGISTRATION_EVENT",
            columnNames: ["registrationId", "eventId"],
            isUnique: true
        }));

        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_EVENT",
            columnNames: ["eventId"]
        }));

        // Update existing records with data from registration table
        await queryRunner.query(`
            UPDATE attendance a
            SET 
                "nationalId" = r."nationalId",
                "phoneNumber" = r."phoneNumber"
            FROM registration r
            WHERE a."registrationId" = r."registrationId"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove indexes
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_REGISTRATION_EVENT");
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_EVENT");

        // Remove added columns
        await queryRunner.query(`
            ALTER TABLE "attendance" 
            DROP COLUMN IF EXISTS "nationalId",
            DROP COLUMN IF EXISTS "phoneNumber"
        `);

        // Restore foreign key constraints
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
    }
} 