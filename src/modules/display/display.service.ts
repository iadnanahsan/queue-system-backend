import {Injectable, NotFoundException, UnauthorizedException, BadRequestException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, FindOperator, ArrayContains} from "typeorm"
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
import {DisplayAccessValidator} from "./validators/display-access.validator"

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
		private counterRepo: Repository<Counter>,
		private displayAccessValidator: DisplayAccessValidator
	) {}

	async generateAccessCode(dto: GenerateDisplayCodeDto): Promise<DisplayAccess> {
		try {
			// This validation should run first and prevent duplicates
			await this.displayAccessValidator.validateNewDisplay(dto.display_type, dto.departmentIds)

			// Validate departments if not ALL_DEPARTMENTS type
			if (dto.display_type !== DisplayType.ALL_DEPARTMENTS) {
				// Validate that all departments exist
				const departments = await this.departmentRepo.findByIds(dto.departmentIds)

				if (departments.length !== dto.departmentIds.length) {
					throw new BadRequestException("One or more departments not found")
				}
			}

			// Create new display access code
			const displayAccess = new DisplayAccess()
			displayAccess.access_code = Math.random().toString(36).substring(2, 8).toUpperCase()
			displayAccess.display_type = dto.display_type
			displayAccess.departmentIds = dto.display_type === DisplayType.ALL_DEPARTMENTS ? null : dto.departmentIds

			return this.displayAccessRepo.save(displayAccess)
		} catch (error) {
			console.error("Error generating access code:", error)
			throw error
		}
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
			(access.display_type === DisplayType.DEPARTMENT_SPECIFIC &&
				access.departmentIds.includes(departmentId) === false)
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
			select: ["queue_number", "patient_name", "file_number", "status"],
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
				select: ["queue_number", "file_number", "status"],
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
				queues: dept.counters.map((counter) => {
					const servingPatient = serving.find((s) => s.counter?.number === counter.number)
					return {
						counter: counter.number,
						current: servingPatient
							? {
									queueNumber: servingPatient.queue_number,
									counter: counter.number,
									fileNumber: servingPatient.file_number,
									status: "serving",
							  }
							: null,
						waiting: waiting.length,
					}
				}),
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
					department_id: access.departmentIds.join(","), // Using comma-separated string
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
			access.departmentIds = updateDto.department_id ? [updateDto.department_id] : null
		}

		return this.displayAccessRepo.save(access)
	}

	async getAllAccessCodes(): Promise<any[]> {
		const codes = await this.displayAccessRepo.find({
			order: {
				created_at: "DESC",
			},
		})

		return Promise.all(
			codes.map(async (code) => {
				let departments = []

				if (code.departmentIds) {
					const departmentIds =
						code.display_type === DisplayType.MULTIPLE_DEPARTMENTS
							? code.departmentIds
							: [code.departmentIds.join(",")]

					departments = await this.departmentRepo.findByIds(departmentIds)
				}

				return {
					...code,
					departments: departments.map((dept) => ({
						id: dept.id,
						name_en: dept.name_en,
						name_ar: dept.name_ar,
					})),
				}
			})
		)
	}

	async getQueueDisplayByCode(code: string) {
		const display = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
		})

		if (!display) {
			throw new NotFoundException("Invalid display code")
		}

		switch (display.display_type) {
			case DisplayType.DEPARTMENT_SPECIFIC:
				return this.getDepartmentDisplay(display.departmentIds.join(","), code)
			case DisplayType.ALL_DEPARTMENTS:
				return this.getAllDepartmentsDisplay(code)
			case DisplayType.MULTIPLE_DEPARTMENTS:
				const departmentIds = display.departmentIds
				return this.getMultipleDepartmentsDisplay(departmentIds, code)
			default:
				throw new BadRequestException("Invalid display type")
		}
	}

	async getDisplayAccessByDepartment(departmentId: string): Promise<DisplayAccess> {
		return this.displayAccessRepo.findOne({
			where: [
				// Check for department specific display
				{
					departmentIds: ArrayContains([departmentId]),
					display_type: DisplayType.DEPARTMENT_SPECIFIC,
					is_active: true,
				},
				// Also check for all departments display
				{
					departmentIds: null,
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

	async getMultipleDepartmentsDisplay(departmentIds: string[], code: string) {
		const departments = await this.departmentRepo.findByIds(departmentIds)

		const departmentDisplays = await Promise.all(
			departments.map(async (dept) => {
				const serving = await this.queueEntryRepository.find({
					where: {
						department_id: dept.id,
						status: "serving",
					},
					relations: ["counter"],
					select: ["queue_number", "patient_name", "file_number", "status"],
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

				return {
					departmentId: dept.id,
					department: {
						name_en: dept.name_en,
						name_ar: dept.name_ar,
					},
					serving: serving.map((entry) => ({
						counter: entry.counter?.number,
						queueNumber: entry.queue_number,
						patientName: entry.patient_name,
						fileNumber: entry.file_number,
						status: entry.status,
					})),
					waiting: waiting.map((entry) => entry.queue_number),
				}
			})
		)

		return {
			display_type: DisplayType.MULTIPLE_DEPARTMENTS,
			departments: departmentDisplays,
		}
	}

	async getDisplayWithDepartments(displayId: string): Promise<DisplayAccess | null> {
		return this.displayAccessRepo.findOne({
			where: {id: displayId},
		})
	}
}
