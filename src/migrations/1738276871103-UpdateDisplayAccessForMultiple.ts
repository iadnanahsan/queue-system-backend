import {MigrationInterface, QueryRunner} from "typeorm"

export class UpdateDisplayAccessForMultiple1738276871103 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		// First add the new column
		await queryRunner.query(`
            ALTER TABLE display_access_codes 
            ADD COLUMN department_ids text[] NULL;
        `)

		// Migrate existing data
		await queryRunner.query(`
            UPDATE display_access_codes
            SET department_ids = ARRAY[department_id]
            WHERE department_id IS NOT NULL 
            AND display_type = 'department_specific';
        `)

		// Drop the old columns
		await queryRunner.query(`
            ALTER TABLE display_access_codes 
            DROP COLUMN IF EXISTS department_id;
        `)

		// Drop metadata if it exists
		await queryRunner.query(`
            ALTER TABLE display_access_codes 
            DROP COLUMN IF EXISTS metadata;
        `)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// Add back the original column
		await queryRunner.query(`
            ALTER TABLE display_access_codes 
            ADD COLUMN department_id uuid NULL;
        `)

		// Restore data (taking first ID for single department cases)
		await queryRunner.query(`
            UPDATE display_access_codes 
            SET department_id = (department_ids[1])::uuid 
            WHERE department_ids IS NOT NULL 
            AND display_type = 'department_specific';
        `)

		// Drop the new column
		await queryRunner.query(`
            ALTER TABLE display_access_codes 
            DROP COLUMN department_ids;
        `)
	}
}
