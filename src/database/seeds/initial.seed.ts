import {DataSource} from "typeorm"
import {Seeder} from "@jorgebodega/typeorm-seeding"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {User} from "../../entities/user.entity"
import {UserRole} from "../../modules/users/enums/user-role.enum"
import * as bcrypt from "bcrypt"

export class InitialDatabaseSeed implements Seeder {
	public async run(dataSource: DataSource): Promise<void> {
		// Get repositories
		const departmentRepository = dataSource.getRepository(Department)
		const counterRepository = dataSource.getRepository(Counter)
		const userRepository = dataSource.getRepository(User)

		// Create departments
		const pharmacy = await departmentRepository.save({
			name_en: "Pharmacy",
			name_ar: "صيدلية",
			prefix: "P",
			is_active: true,
		})

		// Create counters for pharmacy
		const counter1 = await counterRepository.save({
			department_id: pharmacy.id,
			number: 1,
			is_active: true,
		})

		const counter2 = await counterRepository.save({
			department_id: pharmacy.id,
			number: 2,
			is_active: true,
		})

		// Create admin user
		const hashedPassword = await bcrypt.hash("admin123", 10)
		await userRepository.save({
			username: "admin",
			password_hash: hashedPassword,
			role: UserRole.ADMIN,
			is_active: true,
		})

		// Create reception user
		const receptionPassword = await bcrypt.hash("reception123", 10)
		await userRepository.save({
			username: "reception",
			password_hash: receptionPassword,
			role: UserRole.RECEPTIONIST,
			is_active: true,
		})
	}
}
