import {MigrationInterface, QueryRunner} from "typeorm"

export class UpdateDepartmentIdNullable1738276871095 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE "display_access_codes" 
            ALTER COLUMN "department_id" DROP NOT NULL
        `)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
            ALTER TABLE "display_access_codes" 
            ALTER COLUMN "department_id" SET NOT NULL
        `)
	}
}
