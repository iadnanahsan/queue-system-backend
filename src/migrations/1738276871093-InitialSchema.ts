import {MigrationInterface, QueryRunner} from "typeorm"

export class InitialSchema1738276871093 implements MigrationInterface {
	name = "InitialSchema1738276871093"

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`CREATE TABLE "counters" ("id" SERIAL NOT NULL, "department_id" uuid NOT NULL, "number" integer NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_910bfcbadea9cde6397e0daf996" PRIMARY KEY ("id"))`
		)
		await queryRunner.query(
			`CREATE TABLE "queue_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "queue_number" character varying(10) NOT NULL, "file_number" character varying(50) NOT NULL, "patient_name" character varying(100) NOT NULL, "department_id" uuid NOT NULL, "counter_id" integer, "status" character varying(20) NOT NULL DEFAULT 'waiting', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "served_at" TIMESTAMP, "completed_at" TIMESTAMP, "no_show_at" TIMESTAMP, CONSTRAINT "PK_8e533b14d1153fecfad7767bda5" PRIMARY KEY ("id"))`
		)
		await queryRunner.query(
			`CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name_en" character varying(100) NOT NULL, "name_ar" character varying(100) NOT NULL, "prefix" character(1) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ffb59a0da5cc0c1a4919323a1e0" UNIQUE ("prefix"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`
		)
		await queryRunner.query(
			`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(100) NOT NULL, "password_hash" character varying(255) NOT NULL, "role" character varying(20) NOT NULL, "department_id" uuid, "counter_id" integer, "is_active" boolean NOT NULL DEFAULT true, "last_login" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
		)
		await queryRunner.query(
			`CREATE TABLE "display_access_codes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "department_id" uuid NOT NULL, "access_code" character varying(50) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7697b7a4bfefe36ed04b1d40db7" UNIQUE ("access_code"), CONSTRAINT "PK_609839934378be74bada6fe649b" PRIMARY KEY ("id"))`
		)
		await queryRunner.query(
			`ALTER TABLE "counters" ADD CONSTRAINT "FK_55b46b29a10a109f7b01259709d" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		)
		await queryRunner.query(
			`ALTER TABLE "queue_entries" ADD CONSTRAINT "FK_1321da39ce56a5c44e1c885f571" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		)
		await queryRunner.query(
			`ALTER TABLE "queue_entries" ADD CONSTRAINT "FK_7629d57b921edf4d3e26ca5b63c" FOREIGN KEY ("counter_id") REFERENCES "counters"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		)
		await queryRunner.query(
			`ALTER TABLE "users" ADD CONSTRAINT "FK_0921d1972cf861d568f5271cd85" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		)
		await queryRunner.query(
			`ALTER TABLE "display_access_codes" ADD CONSTRAINT "FK_a15e2410d58572abc816b1bf2df" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
		)
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "display_access_codes" DROP CONSTRAINT "FK_a15e2410d58572abc816b1bf2df"`)
		await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_0921d1972cf861d568f5271cd85"`)
		await queryRunner.query(`ALTER TABLE "queue_entries" DROP CONSTRAINT "FK_7629d57b921edf4d3e26ca5b63c"`)
		await queryRunner.query(`ALTER TABLE "queue_entries" DROP CONSTRAINT "FK_1321da39ce56a5c44e1c885f571"`)
		await queryRunner.query(`ALTER TABLE "counters" DROP CONSTRAINT "FK_55b46b29a10a109f7b01259709d"`)
		await queryRunner.query(`DROP TABLE "display_access_codes"`)
		await queryRunner.query(`DROP TABLE "users"`)
		await queryRunner.query(`DROP TABLE "departments"`)
		await queryRunner.query(`DROP TABLE "queue_entries"`)
		await queryRunner.query(`DROP TABLE "counters"`)
	}
}
