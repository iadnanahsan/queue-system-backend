import {
	Injectable,
	ConflictException,
	NotFoundException,
	BadRequestException,
	InternalServerErrorException,
} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {Counter} from "../../entities/counter.entity"
import {CreateCounterDto} from "./dto/create-counter.dto"
import {DepartmentService} from "../departments/departments.service"
import {UpdateCounterDto} from "./dto/update-counter.dto"
import {Not} from "typeorm"

@Injectable()
export class CountersService {
	constructor(
		@InjectRepository(Counter)
		private countersRepository: Repository<Counter>,
		private departmentService: DepartmentService
	) {}

	async create(createCounterDto: CreateCounterDto): Promise<Counter> {
		try {
			// Validate department exists
			const department = await this.departmentService.findOne(createCounterDto.department_id)
			if (!department) {
				throw new NotFoundException(`Department not found`)
			}

			// Check for duplicate counter number
			const existingCounter = await this.countersRepository.findOne({
				where: {
					department_id: createCounterDto.department_id,
					number: createCounterDto.number,
				},
			})

			if (existingCounter) {
				throw new ConflictException(
					`Counter number ${createCounterDto.number} already exists in this department`
				)
			}

			// Create counter
			const counter = this.countersRepository.create({
				department_id: createCounterDto.department_id,
				number: createCounterDto.number,
				is_active: true,
			})

			const savedCounter = await this.countersRepository.save(counter)

			// Return with department details
			return (await this.countersRepository.findOne({
				where: {id: savedCounter.id},
				relations: ["department"],
			})) as Counter
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ConflictException) {
				throw error
			}
			console.error("Error creating counter:", error)
			throw new InternalServerErrorException("Could not create counter")
		}
	}

	async findAll(): Promise<Counter[]> {
		try {
			return await this.countersRepository
				.createQueryBuilder("counter")
				.leftJoinAndSelect("counter.department", "department")
				.orderBy("department.name_en", "ASC")
				.addOrderBy("counter.number", "ASC")
				.getMany()
		} catch (error) {
			console.error("Error fetching counters:", error)
			throw new InternalServerErrorException("Error fetching counters")
		}
	}

	async findByDepartment(departmentId: string): Promise<Counter[]> {
		return this.countersRepository.find({
			where: {
				department_id: departmentId,
			},
			relations: ["department"],
			order: {
				number: "ASC",
			},
		})
	}

	async findOne(id: string): Promise<Counter> {
		const counter = await this.countersRepository.findOne({
			where: {id: Number(id)},
			relations: ["department"],
		})

		if (!counter) {
			throw new NotFoundException(`Counter ${id} not found`)
		}
		return counter
	}

	async toggleActive(id: number): Promise<Counter> {
		try {
			const counter = await this.countersRepository.findOne({
				where: {id},
				relations: ["department"],
			})

			if (!counter) {
				throw new NotFoundException(`Counter with ID ${id} not found`)
			}

			// Toggle the active status
			counter.is_active = !counter.is_active

			// Save and return updated counter
			return await this.countersRepository.save(counter)
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			console.error("Error toggling counter status:", error)
			throw new InternalServerErrorException("Could not toggle counter status")
		}
	}

	async getAvailableCounter(departmentId: string): Promise<Counter> {
		const counters = await this.countersRepository.find({
			where: {
				department_id: departmentId,
				is_active: true,
			},
			order: {
				number: "ASC",
			},
		})

		if (!counters.length) {
			throw new NotFoundException("No active counters available for this department")
		}

		return counters[0]
	}

	async assignCounter(counterId: number, userId: string) {
		const counter = await this.countersRepository.findOne({
			where: {id: counterId},
			select: ["id", "number", "is_active"],
		})
		if (!counter) {
			throw new NotFoundException(`Counter ${counterId} not found`)
		}
		if (!counter.is_active) {
			throw new BadRequestException(`Counter ${counterId} is not active`)
		}

		// Return success response with counter info
		return {
			success: true,
			counterId: counter.id,
			counterNo: counter.number,
		}
	}

	async releaseCounter(counterId: number, userId: string): Promise<void> {
		const counter = await this.countersRepository.findOne({
			where: {id: counterId},
		})
		if (!counter) {
			throw new NotFoundException("Counter not found")
		}
		await this.countersRepository.save(counter)
	}

	async update(id: number, updateCounterDto: UpdateCounterDto): Promise<Counter> {
		try {
			const counter = await this.countersRepository.findOne({
				where: {id},
				relations: ["department"],
			})

			if (!counter) {
				throw new NotFoundException(`Counter with ID ${id} not found`)
			}

			// If updating department_id, check if department exists
			if (updateCounterDto.department_id) {
				const department = await this.departmentService.findOne(updateCounterDto.department_id)
				if (!department) {
					throw new NotFoundException(`Department not found`)
				}

				// Check if counter number already exists in new department
				if (updateCounterDto.number || counter.number) {
					const existingCounter = await this.countersRepository.findOne({
						where: {
							department_id: updateCounterDto.department_id,
							number: updateCounterDto.number || counter.number,
							id: Not(id), // Exclude current counter
						},
					})

					if (existingCounter) {
						throw new ConflictException(
							`Counter number ${
								updateCounterDto.number || counter.number
							} already exists in this department`
						)
					}
				}
			}

			// Update counter
			Object.assign(counter, updateCounterDto)

			// Save and return updated counter
			return await this.countersRepository.save(counter)
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ConflictException) {
				throw error
			}
			console.error("Error updating counter:", error)
			throw new InternalServerErrorException("Could not update counter")
		}
	}
}
