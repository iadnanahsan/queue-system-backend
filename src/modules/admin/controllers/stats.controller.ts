import {Controller, Get, UseGuards} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiResponse, ApiBearerAuth} from "@nestjs/swagger"
import {JwtAuthGuard} from "../../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../../auth/guards/roles.guard"
import {Roles} from "../../auth/decorators/roles.decorator"
import {AdminStatsService} from "../services/stats.service"
import {AdminStatsResponseDto} from "../dto/stats-response.dto"

@Controller("admin/stats")
@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AdminStatsController {
	constructor(private statsService: AdminStatsService) {}

	@Get()
	@ApiOperation({
		summary: "Get Admin Dashboard Statistics",
		description: "Returns counts of departments, counters, queues and users",
	})
	@ApiResponse({
		status: 200,
		description: "Statistics retrieved successfully",
		type: AdminStatsResponseDto,
	})
	@ApiResponse({
		status: 401,
		description: "Unauthorized",
	})
	@ApiResponse({
		status: 403,
		description: "Forbidden - Requires admin role",
	})
	async getStats(): Promise<AdminStatsResponseDto> {
		return this.statsService.getStats()
	}
}
