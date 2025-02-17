import {MigrationInterface, QueryRunner, TableColumn} from "typeorm"

export class AddDisplayType1738276871094 implements MigrationInterface {
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.addColumn(
			"display_access_codes",
			new TableColumn({
				name: "display_type",
				type: "varchar",
				length: "20",
				isNullable: false,
			})
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.dropColumn("display_access_codes", "display_type")
	}
}
