import {Injectable, NotFoundException, UnauthorizedException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {DisplayAccess} from "./entities/display-access.entity"
import {RedisService} from "../../services/redis.service"
import {DisplayGateway} from "./display.gateway"
import {DepartmentQueueDisplay, MultiDepartmentDisplay} from "./interfaces/display.interface"
import {Department} from "../../entities/department.entity"
import {ALL_DEPARTMENTS_ID} from "./constants/display.constants"
import {UpdateDisplayCodeDto} from "./dto/update-display-code.dto"

@Injectable()
export class DisplayService {
	constructor(
		@InjectRepository(DisplayAccess)
		private displayAccessRepository: Repository<DisplayAccess>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		private redisService: RedisService,
		private displayGateway: DisplayGateway
	) {}

	async generateAccessCode(departmentId: string): Promise<DisplayAccess> {
		// Generate 6 character unique code
		const code = Math.random().toString(36).substring(2, 8).toUpperCase()

		const displayAccess = this.displayAccessRepository.create({
			departmentId,
			access_code: code,
			is_active: true,
		})

		return this.displayAccessRepository.save(displayAccess)
	}

	async verifyAccessCode(code: string) {
		// First check Redis if this code was already verified
		const verificationKey = `display:verify:${code}`
		const isVerified = await this.redisService.getClient().get(verificationKey)

		if (isVerified) {
			return {
				message: "Code already verified",
				verified: true,
				displayAccess: JSON.parse(isVerified),
			}
		}

		// If not in Redis, check database
		const displayAccess = await this.displayAccessRepository.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
			relations: ["department"],
		})

		if (!displayAccess) {
			throw new NotFoundException("Invalid display access code")
		}

		// Store in Redis for future checks
		await this.redisService.getClient().set(
			verificationKey,
			JSON.stringify(displayAccess),
			"EX",
			86400 // 24 hours
		)

		return {
			message: "Code verified successfully",
			verified: true,
			displayAccess,
		}
	}

	private async isCodeVerified(code: string): Promise<boolean> {
		const redis = this.redisService.getClient()
		return !!(await redis.get(`display:verified:${code}`))
	}

	async getDepartmentDisplay(departmentId: string, code: string): Promise<DepartmentQueueDisplay | null> {
		const access = await this.displayAccessRepository.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
		})

		// Allow access if code is for all departments or matches specific department
		if (!access || (access.departmentId !== ALL_DEPARTMENTS_ID && access.departmentId !== departmentId)) {
			throw new UnauthorizedException("Invalid access code for this department")
		}

		if (!(await this.isCodeVerified(code))) {
			throw new UnauthorizedException("Invalid or expired access code")
		}
		const redis = this.redisService.getClient()
		const displayKey = `display:${departmentId}:current`

		const currentDisplay = await redis.get(displayKey)
		return currentDisplay ? JSON.parse(currentDisplay) : null
	}

	async getAllDepartmentsDisplay(code: string): Promise<MultiDepartmentDisplay[]> {
		const access = await this.displayAccessRepository.findOne({
			where: {
				access_code: code,
				is_active: true,
			},
		})

		// Only allow if code is for all departments
		if (!access || access.departmentId !== ALL_DEPARTMENTS_ID) {
			throw new UnauthorizedException("This code cannot access all departments")
		}

		if (!(await this.isCodeVerified(code))) {
			throw new UnauthorizedException("Invalid or expired access code")
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
					current: currentDisplay && currentDisplay.counter === counter.number ? currentDisplay : null,
				})),
			})
		}

		return displayData
	}

	async updateAccessCode(id: string, updateDto: UpdateDisplayCodeDto): Promise<DisplayAccess> {
		const access = await this.displayAccessRepository.findOne({
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

		return this.displayAccessRepository.save(access)
	}

	async getAllAccessCodes(): Promise<DisplayAccess[]> {
		return this.displayAccessRepository.find({
			relations: ["department"],
			order: {
				created_at: "DESC",
			},
		})
	}
}
