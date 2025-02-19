import {Injectable} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, ArrayContains} from "typeorm"
import {DisplayAccess} from "../entities/display-access.entity"
import {DisplayType} from "../enums/display-type.enum"
import {BadRequestException} from "@nestjs/common"

@Injectable()
export class DisplayAccessValidator {
	constructor(
		@InjectRepository(DisplayAccess)
		private displayAccessRepo: Repository<DisplayAccess>
	) {}

	async validateNewDisplay(display_type: DisplayType, departmentIds?: string[]): Promise<void> {
		if (display_type === DisplayType.ALL_DEPARTMENTS) {
			const existingAllDepartments = await this.displayAccessRepo.findOne({
				where: {
					display_type: DisplayType.ALL_DEPARTMENTS,
					is_active: true,
				},
			})

			if (existingAllDepartments) {
				throw new BadRequestException(
					`An active ALL_DEPARTMENTS display already exists with code: ${existingAllDepartments.access_code}`
				)
			}
		}

		switch (display_type) {
			case DisplayType.ALL_DEPARTMENTS:
				await this.validateAllDepartments()
				break
			case DisplayType.MULTIPLE_DEPARTMENTS:
				await this.validateMultipleDepartments(departmentIds)
				break
			case DisplayType.DEPARTMENT_SPECIFIC:
				await this.validateDepartmentSpecific(departmentIds[0])
				break
		}
	}

	private async validateAllDepartments(): Promise<void> {
		const existingAll = await this.displayAccessRepo.findOne({
			where: {
				display_type: DisplayType.ALL_DEPARTMENTS,
				is_active: true,
			},
		})

		if (existingAll) {
			throw new BadRequestException(
				`An active all-departments display already exists with code: ${existingAll.access_code}`
			)
		}
	}

	private async validateMultipleDepartments(departmentIds: string[]): Promise<void> {
		// Sort IDs to ensure consistent comparison
		const sortedIds = [...departmentIds].sort()

		const existingDisplays = await this.displayAccessRepo.find({
			where: {
				display_type: DisplayType.MULTIPLE_DEPARTMENTS,
				is_active: true,
			},
		})

		for (const display of existingDisplays) {
			const existingIds = [...display.departmentIds].sort()
			if (JSON.stringify(existingIds) === JSON.stringify(sortedIds)) {
				throw new BadRequestException(
					`A display code already exists for this exact set of departments: ${display.access_code}`
				)
			}
		}
	}

	private async validateDepartmentSpecific(departmentId: string): Promise<void> {
		const existing = await this.displayAccessRepo.findOne({
			where: {
				display_type: DisplayType.DEPARTMENT_SPECIFIC,
				departmentIds: ArrayContains([departmentId]),
				is_active: true,
			},
		})

		if (existing) {
			throw new BadRequestException(
				`An active display code already exists for this department: ${existing.access_code}`
			)
		}
	}
}
