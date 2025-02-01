import {Injectable, NotFoundException, InternalServerErrorException, ConflictException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {Department} from "./entities/department.entity"
import {CreateDepartmentDto} from "./dto/create-department.dto"
import {UpdateDepartmentDto} from "./dto/update-department.dto"
import {Counter} from "../../entities/counter.entity"

@Injectable()
export class DepartmentService {
	constructor(
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>
	) {}

	async create(createDepartmentDto: CreateDepartmentDto): Promise<Department> {
		try {
			// Check if prefix exists
			const existingDepartment = await this.departmentRepository.findOne({
				where: {prefix: createDepartmentDto.prefix},
			})

			if (existingDepartment) {
				throw new ConflictException(`Department prefix ${createDepartmentDto.prefix} already exists`)
			}

			const department = this.departmentRepository.create(createDepartmentDto)
			return await this.departmentRepository.save(department)
		} catch (error) {
			console.error("Error creating department:", error)
			if (error instanceof ConflictException) {
				throw error
			}
			throw new InternalServerErrorException("Error creating department")
		}
	}

	async findAll(): Promise<Department[]> {
		try {
			return await this.departmentRepository.find({
				order: {
					name_en: "ASC",
				},
			})
		} catch (error) {
			console.error("Error retrieving departments:", error)
			throw new InternalServerErrorException("Error retrieving departments")
		}
	}

	async findOne(id: string): Promise<Department> {
		try {
			const department = await this.departmentRepository.findOne({
				where: {id},
				relations: ["counters"],
			})

			if (!department) {
				throw new NotFoundException(`Department with ID ${id} not found`)
			}

			return department
		} catch (error) {
			console.error("Error retrieving department:", error)
			if (error instanceof NotFoundException) {
				throw error
			}
			throw new InternalServerErrorException("Error retrieving department")
		}
	}

	async update(id: string, updateDepartmentDto: UpdateDepartmentDto): Promise<Department> {
		try {
			const department = await this.findOne(id)

			// If prefix is being updated, check for uniqueness
			if (updateDepartmentDto.prefix && updateDepartmentDto.prefix !== department.prefix) {
				const existingDepartment = await this.departmentRepository.findOne({
					where: {prefix: updateDepartmentDto.prefix},
				})
				if (existingDepartment) {
					throw new ConflictException(`Department prefix ${updateDepartmentDto.prefix} already exists`)
				}
			}

			Object.assign(department, updateDepartmentDto)
			return await this.departmentRepository.save(department)
		} catch (error) {
			console.error("Error updating department:", error)
			if (error instanceof NotFoundException || error instanceof ConflictException) {
				throw error
			}
			throw new InternalServerErrorException("Error updating department")
		}
	}

	async remove(id: string): Promise<void> {
		try {
			// First check if department exists
			const department = await this.findOne(id)
			if (!department) {
				throw new NotFoundException(`Department with ID ${id} not found`)
			}

			// Check if department has any counters
			const counters = await this.counterRepository.find({
				where: {department_id: id},
			})

			if (counters.length > 0) {
				throw new ConflictException(
					`Cannot delete department. It has ${counters.length} counter(s) associated with it. Please delete or reassign the counters first.`
				)
			}

			await this.departmentRepository.remove(department)
		} catch (error) {
			if (error instanceof NotFoundException || error instanceof ConflictException) {
				throw error
			}
			throw new ConflictException(
				"Cannot delete department. Make sure all associated counters are deleted first."
			)
		}
	}
}
