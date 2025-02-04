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

@Injectable()
export class DisplayService {
	private readonly DISPLAY_PREFIX = "display:"

	constructor(
		@InjectRepository(DisplayAccess)
		private displayAccessRepo: Repository<DisplayAccess>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(QueueEntry)
		private queueEntryRepository: Repository<QueueEntry>,
		private redisService: RedisService
	) {}

	async generateAccessCode(departmentId: string): Promise<DisplayAccess> {
		// Check for existing active code for this department
		const existingCode = await this.displayAccessRepo.findOne({
			where: {
				departmentId,
				is_active: true,
			},
		})

		if (existingCode) {
			throw new BadRequestException(
				`Department already has an active code: ${existingCode.access_code}. Please deactivate it first or use the existing code.`
			)
		}

		// Generate new code only if no active code exists
		const code = Math.random().toString(36).substring(2, 8).toUpperCase()
		const displayAccess = this.displayAccessRepo.create({
			departmentId,
			access_code: code,
			is_active: true,
		})

		return this.displayAccessRepo.save(displayAccess)
	}

	async getDepartmentDisplay(departmentId: string, code: string): Promise<DepartmentQueueDisplay> {
		// Fetch access directly without verification
		const access = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
		})

		// Allow access if code is for the specific department
		if (!access || access.departmentId !== departmentId) {
			throw new UnauthorizedException("Invalid access code for this department")
		}

		// First try Redis
		const redis = this.redisService.getClient()
		const displayKey = `${this.DISPLAY_PREFIX}${departmentId}:current`
		const cachedDisplay = await redis.get(displayKey)

		if (cachedDisplay) {
			return JSON.parse(cachedDisplay)
		}

		// If not in Redis, get from database
		const department = await this.departmentRepository.findOne({
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
		}

		// Cache the result
		await redis.set(displayKey, JSON.stringify(displayData), "EX", 300) // Cache for 5 minutes

		return displayData
	}

	async getAllDepartmentsDisplay(code: string): Promise<MultiDepartmentDisplay[]> {
		const access = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
		})

		// Only allow if code is for all departments
		if (!access || access.departmentId !== ALL_DEPARTMENTS_ID) {
			throw new UnauthorizedException("This code cannot access all departments")
		}

		const departments = await this.departmentRepository.find({
			where: {is_active: true},
			relations: ["counters"],
		})

		const displayData: MultiDepartmentDisplay[] = []

		for (const dept of departments) {
			const currentDisplay = await this.getDepartmentDisplay(dept.id, code)

			displayData.push({
				departmentId: dept.id,
				name_en: dept.name_en,
				name_ar: dept.name_ar,
				queues: dept.counters.map((counter) => ({
					counter: counter.number,
					current:
						currentDisplay && currentDisplay.serving.some((serving) => serving.counter === counter.number)
							? currentDisplay
							: null,
				})),
			})
		}

		return displayData
	}

	async updateAccessCode(id: string, updateDto: UpdateDisplayCodeDto): Promise<DisplayAccess> {
		const access = await this.displayAccessRepo.findOne({
			where: {id},
			relations: ["department"],
		})

		if (!access) {
			throw new NotFoundException("Display access code not found")
		}

		// If regenerating code
		if (updateDto.regenerate) {
			access.access_code = Math.random().toString(36).substring(2, 8).toUpperCase()
		}

		// Update other fields if provided
		if (updateDto.is_active !== undefined) {
			access.is_active = updateDto.is_active
		}

		if (updateDto.department_id) {
			// If not "all", verify department exists
			if (updateDto.department_id !== ALL_DEPARTMENTS_ID) {
				const department = await this.departmentRepository.findOne({
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

	async getQueueDisplayByCode(code: string): Promise<DepartmentQueueDisplay> {
		// First get and verify the display access
		const displayAccess = await this.displayAccessRepo.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
			relations: ["department"],
		})

		if (!displayAccess) {
			throw new NotFoundException("Invalid display access code")
		}

		// Get the display data using existing function
		const displayData = await this.getDepartmentDisplay(displayAccess.department.id, code)

		if (!displayData) {
			// Initialize empty display data
			return {
				department: {
					name_en: displayAccess.department.name_en,
					name_ar: displayAccess.department.name_ar,
				},
				serving: [],
				waiting: [],
			}
		}

		return displayData
	}

	async getDisplayAccessByDepartment(departmentId: string): Promise<DisplayAccess> {
		return this.displayAccessRepo.findOne({
			where: {departmentId, is_active: true},
		})
	}
}
