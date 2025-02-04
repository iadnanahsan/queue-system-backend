import {Controller, Post, Body, Get, UseGuards, HttpStatus, HttpCode, Param, Put, Query} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiSecurity, ApiQuery} from "@nestjs/swagger"
import {UsersService} from "./users.service"
import {CreateUserDto} from "./dto/create-user.dto"
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../common/guards/roles.guard"
import {Roles} from "../common/decorators/roles.decorator"
import {UserRole} from "./enums/user-role.enum"
import {GetUsersDto} from "./dto/get-users.dto"
import {UpdatePasswordDto} from "./dto/update-password.dto"
import {AssignCounterDto} from "./dto/assign-counter.dto"
import {User} from "../../entities/user.entity"
import {UpdateDepartmentDto} from "./dto/update-department.dto"
import {UpdateUserRoleDto} from "./dto/update-user-role.dto"
import {getSchemaPath} from "@nestjs/swagger/dist"

@ApiTags("user management")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiSecurity("admin")
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Post()
	@Roles("admin")
	@ApiOperation({summary: "Create new user"})
	async createUser(@Body() dto: CreateUserDto) {
		return this.usersService.createUser(dto)
	}

	@Get()
	@Roles(UserRole.ADMIN)
	@ApiOperation({summary: "Get all users with filters"})
	@ApiQuery({name: "page", required: false, type: Number, description: "Page number (default: 1)"})
	@ApiQuery({name: "limit", required: false, type: Number, description: "Items per page (default: 10)"})
	@ApiQuery({name: "role", required: false, enum: UserRole, description: "Filter by user role"})
	@ApiQuery({name: "department_id", required: false, type: String, description: "Filter by department"})
	@ApiQuery({name: "search", required: false, type: String, description: "Search by username or email"})
	@ApiResponse({
		status: 200,
		description: "Users retrieved successfully",
		schema: {
			properties: {
				data: {
					type: "array",
					items: {$ref: getSchemaPath(User)},
				},
				meta: {
					type: "object",
					properties: {
						total: {type: "number"},
						page: {type: "number"},
						limit: {type: "number"},
						totalPages: {type: "number"},
					},
				},
			},
		},
	})
	async getUsers(@Query() query: GetUsersDto) {
		return this.usersService.getUsers(query)
	}

	@Put(":id/status")
	@Roles("admin")
	@ApiOperation({summary: "Toggle user active status"})
	async toggleStatus(@Param("id") id: string) {
		return this.usersService.toggleUserStatus(id)
	}

	@Put(":id/password")
	@Roles("admin")
	@ApiOperation({summary: "Update user password"})
	async updatePassword(@Param("id") id: string, @Body() dto: UpdatePasswordDto) {
		return this.usersService.updatePassword(id, dto.newPassword)
	}

	@Get(":id")
	@Roles(UserRole.ADMIN)
	@ApiOperation({summary: "Get user details"})
	@ApiResponse({status: 200, description: "User found", type: User})
	@ApiResponse({status: 404, description: "User not found"})
	async getUser(@Param("id") id: string) {
		return this.usersService.findById(id)
	}

	@Put(":id/department")
	@Roles(UserRole.ADMIN)
	@ApiOperation({summary: "Update user's department"})
	@ApiResponse({status: 200, description: "Department updated successfully", type: User})
	@ApiResponse({status: 400, description: "Cannot update department - active queues exist"})
	@ApiResponse({status: 404, description: "User or department not found"})
	async updateDepartment(@Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
		return this.usersService.updateUserDepartment(id, dto.departmentId)
	}

	@Put(":id/role")
	@Roles("admin")
	@ApiOperation({
		summary: "Update user role",
		description: "Update user role and department if applicable",
	})
	@ApiResponse({
		status: 200,
		description: "Role updated successfully",
		type: User,
		schema: {
			properties: {
				id: {type: "string"},
				role: {type: "string"},
				department_id: {type: "string", nullable: true},
				counter_id: {type: "number", nullable: true},
			},
		},
	})
	@ApiResponse({
		status: 400,
		description: "Cannot change role - user has active queues",
	})
	@ApiResponse({
		status: 404,
		description: "User or department not found",
	})
	async updateUserRole(@Param("id") id: string, @Body() dto: UpdateUserRoleDto): Promise<User> {
		return this.usersService.updateUserRole(id, dto)
	}
}
