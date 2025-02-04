import {Factory, Seeder} from "@jorgebodega/typeorm-seeding"
import {Connection} from "typeorm"
import {Department} from "../../entities/department.entity"
import {User} from "../../entities/user.entity"
import * as bcrypt from "bcryptjs"
import {UserRole} from "../../modules/users/enums/user-role.enum"

export default class InitialDatabaseSeed implements Seeder {
	public async run(factory: Factory, connection: Connection): Promise<void> {
		// Create admin
		const adminUser = await connection.getRepository(User).save({
			username: "admin",
			password_hash: await bcrypt.hash("admin123", 10),
			role: UserRole.ADMIN,
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
				role: UserRole.RECEPTIONIST,
				is_active: true,
			},
			{
				username: "counter1",
				password_hash: await bcrypt.hash("counter123", 10),
				role: UserRole.COUNTER_STAFF,
				department_id: departments[0].id,
				is_active: true,
			},
			{
				username: "counter2",
				password_hash: await bcrypt.hash("counter123", 10),
				role: UserRole.COUNTER_STAFF,
				department_id: departments[1].id,
				is_active: true,
			},
		])
	}
}
