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
import {UsersService} from "../users/users.service"
import {DepartmentService} from "../departments/departments.service"
import {CountersService} from "../counters/counters.service"
import {UserRole} from "../users/enums/user-role.enum"
import {UsersSeedService} from "./services/users-seed.service"

@Injectable()
export class SeedService {
	constructor(
		@InjectRepository(User)
		private userRepository: Repository<User>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>,
		private usersService: UsersService,
		private departmentService: DepartmentService,
		private countersService: CountersService,
		private usersSeedService: UsersSeedService
	) {}

	async seed() {
		// Create admin if doesn't exist
		await this.seedAdmin()

		// Only seed test data in development
		if (process.env.NODE_ENV === "development") {
			await this.seedTestData()
		}

		await this.usersSeedService.seed()
	}

	private async seedAdmin() {
		const adminExists = await this.usersService.findByUsername("admin")
		if (!adminExists) {
			await this.usersService.createUser({
				username: "admin",
				password: "admin123",
				role: UserRole.ADMIN,
			})
		}
	}

	private async seedTestData() {
		// Create test department
		const dept = await this.departmentService.create({
			name_en: "Radiology",
			name_ar: "قسم الأشعة",
			prefix: "R",
		})

		// Create counters
		await this.countersService.create({
			department_id: dept.id,
			number: 1,
		})

		// Create test staff
		await this.usersService.createUser({
			username: "staff1",
			password: "staff123",
			role: UserRole.COUNTER_STAFF,
			department_id: dept.id,
		})

		await this.usersService.createUser({
			username: "reception1",
			password: "reception123",
			role: UserRole.RECEPTIONIST,
		})
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
