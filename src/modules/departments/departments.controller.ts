import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	UseGuards,
	HttpCode,
	HttpStatus,
	InternalServerErrorException,
} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from "@nestjs/swagger"
import {DepartmentService} from "./departments.service"
import {CreateDepartmentDto} from "./dto/create-department.dto"
import {UpdateDepartmentDto} from "./dto/update-department.dto"
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../common/guards/roles.guard"
import {Roles} from "../common/decorators/roles.decorator"
import {UserRole} from "../users/enums/user-role.enum"
import {DepartmentResponseDto} from "./dto/department-response.dto"

@ApiTags("departments")
@ApiBearerAuth()
@Controller("departments")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiResponse({status: 401, description: "Unauthorized"})
@ApiResponse({status: 403, description: "Forbidden - Insufficient permissions"})
export class DepartmentsController {
	constructor(private readonly departmentService: DepartmentService) {}

	@ApiOperation({summary: "Create new department"})
	@Post()
	@Roles(UserRole.ADMIN)
	@HttpCode(HttpStatus.CREATED)
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Department created successfully",
		type: DepartmentResponseDto,
	})
	async create(@Body() createDepartmentDto: CreateDepartmentDto) {
		return this.departmentService.create(createDepartmentDto)
	}

	@ApiOperation({summary: "Get all departments"})
	@Get()
	findAll() {
		return this.departmentService.findAll()
	}

	@ApiOperation({summary: "Get department by id"})
	@Get(":id")
	findOne(@Param("id") id: string) {
		return this.departmentService.findOne(id)
	}

	@ApiOperation({summary: "Update department"})
	@Put(":id")
	@Roles(UserRole.ADMIN)
	update(@Param("id") id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
		return this.departmentService.update(id, updateDepartmentDto)
	}

	@ApiOperation({summary: "Delete department"})
	@Delete(":id")
	@Roles(UserRole.ADMIN)
	remove(@Param("id") id: string) {
		return this.departmentService.remove(id)
	}

	@Get("health")
	@ApiOperation({summary: "Check database connection"})
	async checkHealth() {
		try {
			await this.departmentService.findAll()
			return {status: "ok", message: "Database connection successful"}
		} catch (error) {
			throw new InternalServerErrorException("Database connection failed")
		}
	}
}
