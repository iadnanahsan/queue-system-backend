import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Put,
	UseGuards,
	HttpStatus,
	HttpCode,
	Request,
	InternalServerErrorException,
	BadRequestException,
	NotFoundException,
	ConflictException,
} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from "@nestjs/swagger"
import {CountersService} from "./counters.service"
import {CreateCounterDto} from "./dto/create-counter.dto"
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../common/guards/roles.guard"
import {Roles} from "../common/decorators/roles.decorator"
import {UserRole} from "../users/enums/user-role.enum"
import {UpdateCounterDto} from "./dto/update-counter.dto"

@ApiTags("counters")
@Controller("counters")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CountersController {
	constructor(private readonly countersService: CountersService) {}

	@Post()
	@Roles(UserRole.ADMIN)
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({summary: "Create a new counter"})
	@ApiResponse({status: HttpStatus.CREATED, description: "Counter created successfully"})
	async create(@Body() createCounterDto: CreateCounterDto) {
		return await this.countersService.create(createCounterDto)
	}

	@Get()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Get all counters"})
	@ApiResponse({status: HttpStatus.OK, description: "Retrieved all counters"})
	async findAll() {
		try {
			return await this.countersService.findAll()
		} catch (error) {
			console.error("Error in findAll counters:", error)
			throw new InternalServerErrorException(error.message || "Error fetching counters")
		}
	}

	@Get("department/:departmentId")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Get counters by department"})
	@ApiResponse({status: HttpStatus.OK, description: "Retrieved department counters"})
	async findByDepartment(@Param("departmentId") departmentId: string) {
		try {
			return await this.countersService.findByDepartment(departmentId)
		} catch (error) {
			console.error("Error fetching department counters:", error)
			throw new InternalServerErrorException(error.message || "Error fetching department counters")
		}
	}

	@Put(":id")
	@Roles(UserRole.ADMIN)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Update counter"})
	async update(@Param("id") id: string, @Body() updateCounterDto: UpdateCounterDto) {
		return await this.countersService.update(Number(id), updateCounterDto)
	}

	@Put(":id/toggle")
	@Roles(UserRole.ADMIN)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Toggle counter active status"})
	@ApiResponse({status: HttpStatus.OK, description: "Counter status toggled successfully"})
	async toggleActive(@Param("id") id: string) {
		return await this.countersService.toggleActive(Number(id))
	}

	@Post("select/:counterId")
	@Roles("counter_staff")
	@ApiOperation({summary: "Select counter for staff"})
	@ApiResponse({status: 200, description: "Counter selected successfully"})
	async selectCounter(@Param("counterId") counterId: number, @Request() req) {
		return this.countersService.assignCounter(counterId, req.user.id)
	}

	@Post("release")
	@Roles("counter_staff")
	@ApiOperation({summary: "Release current counter"})
	async releaseCounter(@Request() req) {
		return this.countersService.releaseCounter(req.user.counter_id, req.user.id)
	}
}
