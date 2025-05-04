import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPassportColumn1744793172733 implements MigrationInterface {
    name = 'AddPassportColumn1744793172733'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if passport column exists
        const columnExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'registration' 
                AND column_name = 'passport'
            );
        `);

        // Add passport column if it doesn't exist
        if (!columnExists[0].exists) {
            await queryRunner.query(`ALTER TABLE "registration" ADD "passport" character varying`);
        }
        
        // Make nationalId nullable
        await queryRunner.query(`ALTER TABLE "registration" ALTER COLUMN "nationalId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Check if passport column exists
        const columnExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'registration' 
                AND column_name = 'passport'
            );
        `);

        // Remove passport column if it exists
        if (columnExists[0].exists) {
            await queryRunner.query(`ALTER TABLE "registration" DROP COLUMN "passport"`);
        }
        
        // Make nationalId required again
        await queryRunner.query(`ALTER TABLE "registration" ALTER COLUMN "nationalId" SET NOT NULL`);
    }
}
