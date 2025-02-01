import {Injectable} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {User} from "../../../entities/user.entity"
import {Department} from "../../../entities/department.entity"
import * as bcrypt from "bcryptjs"
import {UserRole} from "../../../modules/users/enums/user-role.enum"

@Injectable()
export class UsersSeedService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>
	) {}

	async seed() {
		const departments = await this.departmentRepository.find()

		// Create receptionists (one for each department)
		const receptionists = [
			{
				username: "pharmacy_reception",
				password: "pharmacy123",
				departmentId: departments[0].id, // Pharmacy
			},
			{
				username: "xray_reception",
				password: "xray123",
				departmentId: departments[1].id, // X-Ray
			},
			{
				username: "lab_reception",
				password: "lab123",
				departmentId: departments[2].id, // Laboratory
			},
		]

		// Create counter staff (2 for each department)
		const counterStaff = departments.flatMap((dept) => [
			{
				username: `${dept.prefix.toLowerCase()}_counter1`,
				password: "counter123",
				departmentId: dept.id,
			},
			{
				username: `${dept.prefix.toLowerCase()}_counter2`,
				password: "counter123",
				departmentId: dept.id,
			},
		])

		// Seed receptionists
		for (const reception of receptionists) {
			const exists = await this.userRepository.findOne({
				where: {username: reception.username},
			})

			if (!exists) {
				await this.userRepository.save({
					username: reception.username,
					password_hash: await bcrypt.hash(reception.password, 10),
					role: UserRole.RECEPTIONIST,
					department_id: reception.departmentId,
					is_active: true,
				} as User)
			}
		}

		// Seed counter staff
		for (const staff of counterStaff) {
			const exists = await this.userRepository.findOne({
				where: {username: staff.username},
			})

			if (!exists) {
				await this.userRepository.save({
					username: staff.username,
					password_hash: await bcrypt.hash(staff.password, 10),
					role: UserRole.COUNTER_STAFF,
					department_id: staff.departmentId,
					is_active: true,
				} as User)
			}
		}

		console.log("✅ Users seeded successfully")
	}
}
