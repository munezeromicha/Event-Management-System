import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBadgeUrl1710000000000 implements MigrationInterface {
    name = 'AddBadgeUrl1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if column exists before adding
        const hasColumn = await queryRunner.hasColumn('badge', 'badgeUrl');
        if (!hasColumn) {
            await queryRunner.query(`ALTER TABLE "badge" ADD "badgeUrl" character varying`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('badge', 'badgeUrl');
        if (hasColumn) {
            await queryRunner.query(`ALTER TABLE "badge" DROP COLUMN "badgeUrl"`);
        }
    }
} 