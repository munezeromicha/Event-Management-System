import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

/**
 * Migration to optimize database for QR code scanning
 */
export class OptimizeScanningPerformance1682549283001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // First, let's check the actual column names in the attendance table
        const attendanceColumns = await queryRunner.query(
            `SELECT column_name FROM information_schema.columns WHERE table_name = 'attendance'`
        );
        console.log('Existing attendance columns:', attendanceColumns);

        // Add registrationId and eventId as direct columns in attendance table
        // if they don't exist already
        const attendanceTable = await queryRunner.getTable("attendance");
        const hasRegistrationIdColumn = attendanceTable?.findColumnByName("registrationId");
        const hasEventIdColumn = attendanceTable?.findColumnByName("eventId");

        if (!hasRegistrationIdColumn) {
            await queryRunner.addColumn("attendance", new TableColumn({
                name: "registrationId",
                type: "uuid",
                isNullable: true
            }));
        }

        if (!hasEventIdColumn) {
            await queryRunner.addColumn("attendance", new TableColumn({
                name: "eventId",
                type: "uuid",
                isNullable: true
            }));
        }

        // Find the actual foreign key column names
        // This is safer than assuming specific names
        const foreignKeyColumns = await queryRunner.query(`
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM
                information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'attendance'
        `);

        console.log('Foreign key columns:', foreignKeyColumns);

        // Look for the registration and event foreign key columns
        let registrationFKColumn = null;
        let eventFKColumn = null;

        for (const fk of foreignKeyColumns) {
            if (fk.foreign_table_name === 'registration') {
                registrationFKColumn = fk.column_name;
            } else if (fk.foreign_table_name === 'event') {
                eventFKColumn = fk.column_name;
            }
        }

        console.log('Registration FK column:', registrationFKColumn);
        console.log('Event FK column:', eventFKColumn);

        // Update the existing records to fill in the new columns
        if (registrationFKColumn) {
            await queryRunner.query(`
                UPDATE attendance a
                SET "registrationId" = a."${registrationFKColumn}"
                WHERE a."registrationId" IS NULL
            `);
        }

        if (eventFKColumn) {
            await queryRunner.query(`
                UPDATE attendance a
                SET "eventId" = a."${eventFKColumn}"
                WHERE a."eventId" IS NULL
            `);
        }

        // Add indexes for faster lookups
        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_REGISTRATION_EVENT",
            columnNames: ["registrationId", "eventId"]
        }));

        await queryRunner.createIndex("registration", new TableIndex({
            name: "IDX_REGISTRATION_EVENT",
            columnNames: ["eventId"]
        }));

        // Add index for faster attendance lookups by event
        await queryRunner.createIndex("attendance", new TableIndex({
            name: "IDX_ATTENDANCE_EVENT",
            columnNames: ["eventId"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove indexes
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_REGISTRATION_EVENT");
        await queryRunner.dropIndex("registration", "IDX_REGISTRATION_EVENT");
        await queryRunner.dropIndex("attendance", "IDX_ATTENDANCE_EVENT");

        // Remove columns if added
        const attendanceTable = await queryRunner.getTable("attendance");
        const hasRegistrationIdColumn = attendanceTable?.findColumnByName("registrationId");
        const hasEventIdColumn = attendanceTable?.findColumnByName("eventId");

        if (hasRegistrationIdColumn) {
            await queryRunner.dropColumn("attendance", "registrationId");
        }

        if (hasEventIdColumn) {
            await queryRunner.dropColumn("attendance", "eventId");
        }
    }
}