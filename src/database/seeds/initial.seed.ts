import {Factory, Seeder} from "typeorm-seeding"
import {Connection} from "typeorm"
import {Department} from "../../modules/departments/entities/department.entity"
import {User} from "../../modules/users/entities/user.entity"
import * as bcrypt from "bcrypt"

export default class InitialDatabaseSeed implements Seeder {
	public async run(factory: Factory, connection: Connection): Promise<void> {
		// Create admin
		const adminUser = await connection.getRepository(User).save({
			username: "admin",
			password_hash: await bcrypt.hash("admin123", 10),
			role: "admin",
			is_active: true,
		})

		// Create departments
		const departments = await connection.getRepository(Department).save([
			{
				name_en: "Radiology",
				name_ar: "قسم الأشعة",
				prefix: "R",
				is_active: true,
			},
			{
				name_en: "Laboratory",
				name_ar: "المختبر",
				prefix: "L",
				is_active: true,
			},
		])

		// Create staff accounts
		await connection.getRepository(User).save([
			{
				username: "reception1",
				password_hash: await bcrypt.hash("reception123", 10),
				role: "receptionist",
				is_active: true,
			},
			{
				username: "counter1",
				password_hash: await bcrypt.hash("counter123", 10),
				role: "counter_staff",
				department_id: departments[0].id,
				is_active: true,
			},
			{
				username: "counter2",
				password_hash: await bcrypt.hash("counter123", 10),
				role: "counter_staff",
				department_id: departments[1].id,
				is_active: true,
			},
		])
	}
}
