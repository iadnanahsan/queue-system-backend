// Create admin user
// Create basic departments
// Set up initial counters

import {Injectable} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {User} from "../../entities/user.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import * as bcrypt from "bcryptjs"

@Injectable()
export class SeedService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>
	) {}

	async seed() {
		await this.createAdmin()
		await this.createDepartments()
		await this.createCounters()
	}

	private async createAdmin() {
		const adminExists = await this.userRepository.findOne({
			where: {username: "admin"},
		})

		if (!adminExists) {
			const passwordHash = await bcrypt.hash("admin123", 10)
			await this.userRepository.save({
				username: "admin",
				password_hash: passwordHash,
				role: "admin",
				is_active: true,
			})
		}
	}

	private async createDepartments() {
		const departments = [
			{name_en: "X-Ray", name_ar: "أشعة", prefix: "X"},
			{name_en: "Laboratory", name_ar: "مختبر", prefix: "L"},
			{name_en: "Pharmacy", name_ar: "صيدلية", prefix: "P"},
		]

		for (const dept of departments) {
			const exists = await this.departmentRepository.findOne({
				where: {prefix: dept.prefix},
			})
			if (!exists) {
				await this.departmentRepository.save(dept)
			}
		}
	}

	private async createCounters() {
		const departments = await this.departmentRepository.find()
		for (const dept of departments) {
			const countersExist = await this.counterRepository.find({
				where: {department_id: dept.id},
			})

			if (!countersExist.length) {
				// Create 3 counters for each department
				for (let i = 1; i <= 3; i++) {
					await this.counterRepository.save({
						department_id: dept.id,
						number: i,
						is_active: true,
					})
				}
			}
		}
	}
}
