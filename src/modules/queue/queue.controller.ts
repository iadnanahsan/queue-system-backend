import {
	Controller,
	Post,
	Body,
	Get,
	Param,
	Put,
	UseGuards,
	HttpStatus,
	HttpCode,
	BadRequestException,
	NotFoundException,
	InternalServerErrorException,
	Req,
	Query,
} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam} from "@nestjs/swagger"
import {QueueService} from "./queue.service"
import {CreateQueueEntryDto} from "./dto/create-queue-entry.dto"
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../common/guards/roles.guard"
import {Roles} from "../common/decorators/roles.decorator"
import {UpdateQueueStatusDto} from "./dto/update-queue-status.dto"
import {ServePatientDto} from "./dto/serve-patient.dto"
import {Request} from "express"
import {JwtPayload} from "jsonwebtoken"
import {GetQueueMetricsDto} from "./dto/get-queue-metrics.dto"
import {UuidValidationPipe} from "../../common/pipes/validation.pipe"

@ApiTags("queue")
@Controller("queue")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QueueController {
	constructor(private readonly queueService: QueueService) {}

	@Post("register")
	@Roles("receptionist")
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({summary: "Register new patient in queue"})
	@ApiResponse({status: HttpStatus.CREATED, description: "Patient registered successfully"})
	@ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid input"})
	@ApiResponse({status: HttpStatus.NOT_FOUND, description: "Department not found"})
	@ApiResponse({status: HttpStatus.FORBIDDEN, description: "Forbidden resource"})
	async registerPatient(@Body() createQueueEntryDto: CreateQueueEntryDto) {
		try {
			return await this.queueService.registerPatient(createQueueEntryDto)
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			if (error instanceof BadRequestException) {
				throw error
			}
			console.error("Queue registration error:", error)
			throw new InternalServerErrorException("Could not register patient")
		}
	}

	@Get("department/:departmentId")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Get department queue"})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Retrieved department queue",
		content: {
			"application/json": {
				example: {
					queue: [
						{
							id: "uuid",
							queueNumber: "A001",
							patientName: "John Doe",
							status: "waiting",
						},
					],
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Department not found",
		content: {
			"application/json": {
				example: {
					message: "Department with ID 1 does not exist",
					error: "Not Found",
					statusCode: 404,
				},
			},
		},
	})
	async getDepartmentQueue(@Param("departmentId") departmentId: string) {
		try {
			const queue = await this.queueService.getDepartmentQueue(departmentId)
			return {queue}
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			throw new InternalServerErrorException("Could not retrieve department queue")
		}
	}

	@Post(":id/call")
	@Roles("counter_staff")
	@ApiOperation({
		summary: "Call patient number",
		description: "Calls/recalls patient number and triggers audio announcement",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Call initiated successfully",
		content: {
			"application/json": {
				example: {
					success: true,
					message: "Call initiated",
					queueNumber: "A001",
					patientName: "John Doe",
					counter: 1,
					isRecall: true, // indicates if this is a recall
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Queue entry not found",
		content: {
			"application/json": {
				example: {
					statusCode: 404,
					message: "Queue entry not found",
					error: "Not Found",
				},
			},
		},
	})
	async callNumber(@Param("id") id: string) {
		try {
			return await this.queueService.callNumber(id)
		} catch (error) {
			if (error instanceof NotFoundException) {
				throw error
			}
			throw new InternalServerErrorException((error as Error).message || "Could not process call request")
		}
	}

	@Post(":id/serve")
	@Roles("counter_staff")
	@ApiOperation({
		summary: "Start serving patient",
		description: "Assign counter and start serving the patient. Required first step before any status changes.",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Patient now being served",
		content: {
			"application/json": {
				example: {
					id: "uuid",
					queueNumber: "K008",
					patientName: "John Doe",
					status: "serving",
					counterId: 1,
					servedAt: "2024-01-31T10:00:00Z",
				},
			},
		},
	})
	@ApiParam({
		name: "id",
		description: "Queue entry UUID",
		example: "10cc4880-035e-4384-8841-5d6cf4d19cde",
	})
	@ApiResponse({
		status: HttpStatus.NOT_FOUND,
		description: "Queue entry not found",
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Invalid counter ID or status transition",
	})
	async servePatient(@Param("id") id: string, @Body() dto: ServePatientDto) {
		return this.queueService.servePatient(id, dto.counterId)
	}

	@Post(":id/complete")
	@Roles("counter_staff")
	@ApiOperation({
		summary: "Complete patient service",
		description: "Mark patient as completed. Requires patient to be in SERVING status.",
	})
	async completePatient(@Param("id") id: string) {
		return this.queueService.completePatient(id)
	}

	@Post(":id/no-show")
	@Roles("counter_staff")
	@ApiOperation({
		summary: "Mark patient as no-show",
		description: "Mark patient as no-show. Can be done for waiting or serving patients.",
	})
	async markNoShow(@Param("id") id: string) {
		return this.queueService.markNoShow(id)
	}

	@Post("next/:departmentId/:counterId")
	@Roles("counter_staff")
	@ApiOperation({
		summary: "Complete current patient and call next",
		description: "Completes the current patient (if any) and calls the next patient in queue",
	})
	async completeAndCallNext(
		@Param("departmentId", UuidValidationPipe) departmentId: string,
		@Param("counterId") counterId: number
	) {
		return this.queueService.completeAndCallNext(departmentId, counterId)
	}

	@Get("counter/queue")
	@Roles("counter_staff")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Get counter staff's queue",
		description: "Get current serving patient and waiting list for staff's department",
	})
	async getMyCounterQueue(@Req() req: Request) {
		const staff = req.user as JwtPayload // Get user from token
		return this.queueService.getCounterQueueDetails(staff.counterId, staff.departmentId)
	}

	@Get("metrics/staff")
	@Roles("admin")
	@ApiOperation({
		summary: "Get counter metrics",
		description: "Get detailed metrics per counter within date range",
	})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Counter metrics retrieved successfully",
		content: {
			"application/json": {
				example: [
					{
						counterId: 1,
						counterNumber: 1,
						departmentName: "Cardiology",
						departmentId: "uuid",
						staffId: "uuid",
						staffName: "John Smith",
						totalServed: 25,
						noShows: 3,
						averageServiceTime: 12,
					},
				],
			},
		},
	})
	async getStaffMetrics(@Query() dto: GetQueueMetricsDto) {
		return this.queueService.getStaffMetrics(dto)
	}

	@Get("metrics/departments")
	@Roles("admin")
	@ApiOperation({
		summary: "Get department metrics",
		description: "Get metrics per department within date range",
	})
	async getDepartmentMetrics(@Query() dto: GetQueueMetricsDto) {
		return this.queueService.getDepartmentMetrics(dto)
	}
}
