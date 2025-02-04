import {Injectable, BadRequestException, ConflictException, NotFoundException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, In, Not} from "typeorm"
import {User} from "../../entities/user.entity"
import {Counter} from "../../entities/counter.entity"
import {QueueEntry} from "../queue/entities/queue-entry.entity"
import {QueueStatus} from "../queue/enums/queue-status.enum"
import {CreateUserDto} from "./dto/create-user.dto"
import {GetUsersDto} from "./dto/get-users.dto"
import {UserRole} from "./enums/user-role.enum"
import {UpdatePasswordDto} from "./dto/update-password.dto"
import * as bcrypt from "bcryptjs"
import {Department} from "../../entities/department.entity"
import {UpdateUserRoleDto} from "./dto/update-user-role.dto"

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private usersRepository: Repository<User>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>,
		@InjectRepository(QueueEntry)
		private queueRepository: Repository<QueueEntry>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>
	) {}

	private async validateCounterStaffAssignment(dto: CreateUserDto) {
		if (!dto.counter_id || !dto.department_id) {
			throw new BadRequestException("Counter staff requires both counter and department")
		}

		const counter = await this.counterRepository.findOne({
			where: {
				id: dto.counter_id,
				department_id: dto.department_id,
				is_active: true,
			},
		})
		if (!counter) {
			throw new BadRequestException("Invalid counter for department")
		}

		const existingStaff = await this.usersRepository.findOne({
			where: {
				counter_id: dto.counter_id,
				is_active: true,
			},
		})
		if (existingStaff) {
			throw new BadRequestException("Counter already assigned to active staff")
		}
	}

	private async checkActiveQueues(counterId: number): Promise<boolean> {
		const count = await this.queueRepository.count({
			where: {
				counterId: counterId,
				status: In([QueueStatus.WAITING, QueueStatus.SERVING]),
			},
		})
		return count > 0
	}

	async createUser(dto: CreateUserDto): Promise<User> {
		const existingUser = await this.usersRepository.findOne({
			where: {username: dto.username},
		})

		if (existingUser) {
			throw new ConflictException("Username already exists")
		}

		if (dto.role === UserRole.COUNTER_STAFF) {
			await this.validateCounterStaffAssignment(dto)
		}

		const hashedPassword = await bcrypt.hash(dto.password, 10)
		const user = this.usersRepository.create({
			...dto,
			password_hash: hashedPassword,
		})

		return this.usersRepository.save(user)
	}

	async getUsers(query: GetUsersDto) {
		const {page = 1, limit = 10, search, role, department_id} = query

		// Debug query params
		console.log("Query params:", {page, limit, search, role, department_id})

		const skip = (page - 1) * limit

		const queryBuilder = this.usersRepository
			.createQueryBuilder("user")
			.leftJoinAndSelect("user.department", "department")
			.leftJoinAndSelect("user.counter", "counter")

		if (search) {
			queryBuilder.where("user.username ILIKE :search OR user.email ILIKE :search", {search: `%${search}%`})
		}

		if (role) {
			queryBuilder.andWhere("user.role = :role", {role})

			// Only apply department filter for counter staff
			if (role === UserRole.COUNTER_STAFF && department_id) {
				queryBuilder.andWhere("user.department_id = :departmentId", {
					departmentId: department_id,
				})
			}
		} else if (department_id) {
			// If no role filter but department_id is provided, only show counter staff
			queryBuilder
				.andWhere("user.role = :role", {role: UserRole.COUNTER_STAFF})
				.andWhere("user.department_id = :departmentId", {
					departmentId: department_id,
				})
		}

		const [users, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount()

		return {
			data: users,
			meta: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		}
	}

	async findById(id: string): Promise<User> {
		const user = await this.usersRepository.findOne({
			where: {id},
			relations: ["department", "counter"],
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		return user
	}

	async updatePassword(userId: string, newPassword: string): Promise<void> {
		const user = await this.findById(userId)
		const hashedPassword = await bcrypt.hash(newPassword, 10)

		await this.usersRepository.update(user.id, {
			password_hash: hashedPassword,
		})
	}

	async assignCounter(userId: string, counterId: number): Promise<User> {
		const user = await this.findById(userId)

		if (user.role !== UserRole.COUNTER_STAFF) {
			throw new BadRequestException("Can only assign counters to counter staff")
		}

		const counter = await this.counterRepository.findOne({
			where: {
				id: counterId,
				is_active: true,
			},
		})

		if (!counter) {
			throw new NotFoundException("Counter not found or inactive")
		}

		const existingStaff = await this.usersRepository.findOne({
			where: {
				counter_id: counterId,
				is_active: true,
				id: Not(userId),
			},
		})

		if (existingStaff) {
			throw new BadRequestException("Counter already assigned to another active staff")
		}

		user.counter_id = counterId
		return this.usersRepository.save(user)
	}

	async findAll(): Promise<User[]> {
		return this.usersRepository.find({
			select: ["id", "username", "role", "department_id", "is_active", "last_login"],
			relations: ["department"],
		})
	}

	async findByDepartment(departmentId: string): Promise<User[]> {
		return this.usersRepository.find({
			where: {department_id: departmentId},
			select: ["id", "username", "role", "is_active", "last_login"],
		})
	}

	async findByUsername(username: string): Promise<User | null> {
		return this.usersRepository.findOne({where: {username}})
	}

	async toggleUserStatus(userId: string) {
		const user = await this.usersRepository.findOne({
			where: {id: userId},
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		if (user.role === UserRole.COUNTER_STAFF && user.is_active && user.counter_id) {
			const hasActiveQueues = await this.queueRepository.count({
				where: {
					counterId: user.counter_id,
					status: In([QueueStatus.WAITING, QueueStatus.SERVING]),
				},
			})
			if (hasActiveQueues > 0) {
				throw new BadRequestException("Cannot deactivate staff with active queues")
			}
		}

		user.is_active = !user.is_active
		return this.usersRepository.save(user)
	}

	async updateUserDepartment(userId: string, departmentId: string): Promise<User> {
		const user = await this.findById(userId)

		// Handle active counter staff
		if (user.role === UserRole.COUNTER_STAFF) {
			// Check active queues
			if (user.counter_id) {
				const hasActiveQueues = await this.checkActiveQueues(user.counter_id)
				if (hasActiveQueues) {
					throw new BadRequestException("Cannot change department while staff has active queues")
				}
			}

			// Remove counter assignment when changing department
			user.counter_id = undefined
		}

		// Verify department exists
		const department = await this.departmentRepository.findOne({
			where: {id: departmentId},
		})
		if (!department) {
			throw new NotFoundException("Department not found")
		}

		user.department_id = departmentId
		return this.usersRepository.save(user)
	}

	async updateUserRole(id: string, dto: UpdateUserRoleDto): Promise<User> {
		const user = await this.usersRepository.findOne({
			where: {id},
			relations: ["department", "counter"],
		})

		if (!user) {
			throw new NotFoundException("User not found")
		}

		// Check if user has active queues
		if (user.counter_id) {
			const hasActiveQueues = await this.checkActiveQueues(user.counter_id)
			if (hasActiveQueues) {
				throw new BadRequestException("Cannot change role while user has active queues")
			}
		}

		// Handle role-specific requirements
		switch (dto.role) {
			case UserRole.COUNTER_STAFF:
				if (!dto.department_id) {
					throw new BadRequestException("Department is required for counter staff")
				}
				const department = await this.departmentRepository.findOne({
					where: {id: dto.department_id},
				})
				if (!department) {
					throw new NotFoundException("Department not found")
				}
				break

			case UserRole.ADMIN:
			case UserRole.RECEPTIONIST:
				// Clear department and counter for non-department roles
				dto.department_id = null
				break
		}

		// Update user
		user.role = dto.role
		user.department_id = dto.department_id
		user.counter_id = null // Always reset counter on role change

		return this.usersRepository.save(user)
	}
}
