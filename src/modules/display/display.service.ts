import {Injectable, NotFoundException, UnauthorizedException, BadRequestException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {DisplayAccess} from "./entities/display-access.entity"
import {RedisService} from "../../services/redis.service"
import {DisplayGateway} from "./display.gateway"
import {DepartmentQueueDisplay, MultiDepartmentDisplay} from "./interfaces/display.interface"
import {Department} from "../../entities/department.entity"
import {ALL_DEPARTMENTS_ID} from "./constants/display.constants"
import {UpdateDisplayCodeDto} from "./dto/update-display-code.dto"
import {QueueEntry} from "../../entities/queue-entry.entity"
import {In} from "typeorm"
import {GenerateDisplayCodeDto} from "./dto/generate-display-code.dto"
import {DisplayType} from "./enums/display-type.enum"
import {Counter} from "../../entities/counter.entity"

@Injectable()
export class DisplayService {
	private readonly DISPLAY_PREFIX = "display:"

	constructor(
		@InjectRepository(DisplayAccess)
		private displayAccessRepo: Repository<DisplayAccess>,
		@InjectRepository(Department)
		private departmentRepo: Repository<Department>,
		@InjectRepository(QueueEntry)
		private queueEntryRepository: Repository<QueueEntry>,
		private redisService: RedisService,
		@InjectRepository(Counter)
		private counterRepo: Repository<Counter>
	) {}

	async generateAccessCode(dto: GenerateDisplayCodeDto): Promise<DisplayAccess> {
		// First check if any departments exist
		const departmentCount = await this.departmentRepo.count()
		if (departmentCount === 0) {
			throw new BadRequestException("Cannot create display codes when no departments exist in the system")
		}

		if (dto.display_type === DisplayType.DEPARTMENT_SPECIFIC) {
			// Verify department exists
			const department = await this.departmentRepo.findOne({
				where: {id: dto.departmentId},
			})

			if (!department) {
				throw new NotFoundException(`Department with ID ${dto.departmentId} not found`)
			}

			// Check for existing department-specific code
			const existingCode = await this.displayAccessRepo.findOne({
				where: {
					departmentId: dto.departmentId,
					display_type: DisplayType.DEPARTMENT_SPECIFIC,
					is_active: true,
				},
			})

			if (existingCode) {
				throw new BadRequestException(
					`Department already has an active code: ${existingCode.access_code}. Please deactivate it first.`
				)
			}
		} else {
			// Check for existing all-departments code
			const existingAllDepts = await this.displayAccessRepo.findOne({
				where: {
					display_type: DisplayType.ALL_DEPARTMENTS,
					is_active: true,
				},
			})

			if (existingAllDepts) {
				throw new BadRequestException(
					"A code for all departments already exists. You can regenerate it if needed."
				)
			}
		}

		// Generate new code
		const code = Math.random().toString(36).substring(2, 8).toUpperCase()
		const displayAccess = this.displayAccessRepo.create({
			departmentId: dto.display_type === DisplayType.DEPARTMENT_SPECIFIC ? dto.departmentId : null,
			access_code: code,
			display_type: dto.display_type,
			is_active: true,
		})

		return this.displayAccessRepo.save(displayAccess)
	}

	async getDepartmentDisplay(departmentId: string, code: string): Promise<DepartmentQueueDisplay> {
		// Fetch access and verify it's for this department
		const access = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
		})

		// Allow access if code is for this department or is an all-departments code
		if (
			!access ||
			(access.display_type === DisplayType.DEPARTMENT_SPECIFIC && access.departmentId !== departmentId)
		) {
			throw new UnauthorizedException("Invalid access code for this department")
		}

		// First try Redis
		const redis = this.redisService.getClient()
		const displayKey = `${this.DISPLAY_PREFIX}${departmentId}:current`
		const cachedDisplay = await redis.get(displayKey)

		if (cachedDisplay) {
			const parsed = JSON.parse(cachedDisplay)
			// Ensure cached data has display_type
			return {
				...parsed,
				display_type: DisplayType.DEPARTMENT_SPECIFIC,
			}
		}

		// If not in Redis, get from database
		const department = await this.departmentRepo.findOne({
			where: {id: departmentId},
		})

		// Get serving patients from database
		const serving = await this.queueEntryRepository.find({
			where: {
				department_id: departmentId,
				status: "serving",
			},
			relations: ["counter"],
		})

		// Get waiting patients
		const waiting = await this.queueEntryRepository.find({
			where: {
				department_id: departmentId,
				status: "waiting",
			},
			order: {
				created_at: "ASC",
			},
		})

		// Format display data
		const displayData = {
			display_type: DisplayType.DEPARTMENT_SPECIFIC,
			data: {
				department: {
					name_en: department.name_en,
					name_ar: department.name_ar,
				},
				serving: serving.map((entry) => ({
					counter: entry.counter?.number,
					queueNumber: entry.queue_number,
					patientName: entry.patient_name,
					fileNumber: entry.file_number,
					status: entry.status,
				})),
				waiting: waiting.map((entry) => entry.queue_number),
			},
		}

		// Cache the result
		await redis.set(displayKey, JSON.stringify(displayData), "EX", 300) // Cache for 5 minutes

		return displayData
	}

	async getAllDepartmentsDisplay(code: string): Promise<MultiDepartmentDisplay> {
		const access = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				display_type: DisplayType.ALL_DEPARTMENTS,
				is_active: true,
			},
		})

		if (!access) {
			throw new UnauthorizedException("Invalid display code")
		}

		const departments = await this.departmentRepo.find({
			where: {is_active: true},
			relations: ["counters"],
		})

		const departmentsData = []

		for (const dept of departments) {
			const serving = await this.queueEntryRepository.find({
				where: {
					department_id: dept.id,
					status: "serving",
				},
				relations: ["counter"],
			})

			const waiting = await this.queueEntryRepository.find({
				where: {
					department_id: dept.id,
					status: "waiting",
				},
				order: {
					created_at: "ASC",
				},
			})

			departmentsData.push({
				departmentId: dept.id,
				name_en: dept.name_en,
				name_ar: dept.name_ar,
				queues: dept.counters.map((counter) => ({
					counter: counter.number,
					current: serving.find((s) => s.counter?.number === counter.number)
						? {
								queueNumber: serving.find((s) => s.counter?.number === counter.number).queue_number,
								counter: counter.number,
								status: "serving",
						  }
						: null,
					waiting: waiting.length,
				})),
			})
		}

		return {
			display_type: DisplayType.ALL_DEPARTMENTS,
			data: departmentsData,
		}
	}

	async updateAccessCode(id: string, updateDto: UpdateDisplayCodeDto): Promise<DisplayAccess> {
		const access = await this.displayAccessRepo.findOne({
			where: {id},
			relations: ["department"],
		})

		if (!access) {
			throw new NotFoundException("Display access code not found")
		}

		// If trying to deactivate
		if (updateDto.is_active === false && access.is_active === true) {
			// Check for active queues in the department
			const activeQueues = await this.queueEntryRepository.count({
				where: {
					department_id: access.departmentId,
					status: In(["waiting", "serving"]), // Using string literals to match existing code
				},
			})

			if (activeQueues > 0) {
				throw new BadRequestException(
					"Cannot deactivate display code while there are active queues in the department"
				)
			}
		}

		// Keep existing functionality
		if (updateDto.regenerate) {
			access.access_code = Math.random().toString(36).substring(2, 8).toUpperCase()
		}

		if (updateDto.is_active !== undefined) {
			access.is_active = updateDto.is_active
		}

		if (updateDto.department_id) {
			if (updateDto.department_id !== ALL_DEPARTMENTS_ID) {
				const department = await this.departmentRepo.findOne({
					where: {id: updateDto.department_id},
				})
				if (!department) {
					throw new NotFoundException("Department not found")
				}
			}
			access.departmentId = updateDto.department_id
		}

		return this.displayAccessRepo.save(access)
	}

	async getAllAccessCodes(): Promise<DisplayAccess[]> {
		return this.displayAccessRepo.find({
			relations: ["department"],
			order: {
				created_at: "DESC",
			},
		})
	}

	async getQueueDisplayByCode(code: string) {
		const display = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
			relations: ["department"],
		})

		if (!display) {
			throw new NotFoundException("Invalid display code")
		}

		// Return appropriate display based on type
		return display.display_type === DisplayType.ALL_DEPARTMENTS
			? this.getAllDepartmentsDisplay(code)
			: this.getDepartmentDisplay(display.departmentId, code)
	}

	async getDisplayAccessByDepartment(departmentId: string): Promise<DisplayAccess> {
		return this.displayAccessRepo.findOne({
			where: [
				// Check for department specific display
				{
					departmentId,
					display_type: DisplayType.DEPARTMENT_SPECIFIC,
					is_active: true,
				},
				// Also check for all departments display
				{
					departmentId: null,
					display_type: DisplayType.ALL_DEPARTMENTS,
					is_active: true,
				},
			],
		})
	}

	async invalidateDisplayCache(departmentId: string) {
		const redis = this.redisService.getClient()
		const displayKey = `${this.DISPLAY_PREFIX}${departmentId}:current`
		await redis.del(displayKey)
	}

	async getDisplayAccessByType(type: DisplayType): Promise<DisplayAccess[]> {
		// Validate display type
		if (!Object.values(DisplayType).includes(type)) {
			throw new BadRequestException(`Invalid display type: ${type}`)
		}

		return this.displayAccessRepo.find({
			where: {
				display_type: type,
				is_active: true,
			},
			relations: ["department"], // Include department data for context
		})
	}

	async getDepartmentById(id: string): Promise<Department> {
		const department = await this.departmentRepo.findOne({
			where: {id},
		})

		if (!department) {
			throw new NotFoundException(`Department with ID ${id} not found`)
		}

		return department
	}

	async getCounterById(id: number) {
		return this.counterRepo.findOne({
			where: {id},
		})
	}
}
