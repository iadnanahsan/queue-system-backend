import {Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Param, Query, Patch} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery} from "@nestjs/swagger"
import {DisplayService} from "./display.service"
import {GenerateDisplayCodeDto} from "./dto/generate-display-code.dto"
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../common/guards/roles.guard"
import {Roles} from "../common/decorators/roles.decorator"
import {Public} from "../../common/decorators/public.decorator"
import {UpdateDisplayCodeDto} from "./dto/update-display-code.dto"
import {DepartmentQueueDisplay} from "./interfaces/display.interface"

@ApiTags("display")
@Controller("display")
@UseGuards(JwtAuthGuard)
export class DisplayController {
	constructor(private readonly displayService: DisplayService) {}

	@Post("code/generate")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("admin")
	@HttpCode(HttpStatus.CREATED)
	@ApiOperation({
		summary: "Generate new display access code",
		description: `Generates an access code for display screens. 
			Can create either department-specific or all-departments display codes.
			Only one active code per department is allowed.`,
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Display access code generated successfully",
		schema: {
			example: {
				id: "uuid",
				departmentId: "123e4567-e89b-12d3-a456-426614174000",
				access_code: "ABC123",
				display_type: "department_specific",
				is_active: true,
				created_at: "2024-01-31T10:00:00Z",
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Department already has an active code",
		schema: {
			example: {
				message: "Department already has an active code: XYZ789. Please deactivate it first.",
				error: "Bad Request",
				statusCode: 400,
			},
		},
	})
	async generateCode(@Body() dto: GenerateDisplayCodeDto) {
		return this.displayService.generateAccessCode(dto)
	}

	@Get("queue")
	@Public()
	@ApiOperation({
		summary: "Access display screen",
		description: "Returns queue data based on display type determined by the access code",
	})
	@ApiQuery({
		name: "code",
		required: true,
		description: "Display access code",
		example: "ABC123",
	})
	@ApiResponse({
		status: 200,
		description: "Queue display data",
		content: {
			"application/json": {
				examples: {
					department_specific: {
						value: {
							department: {
								name_en: "Patient Affairs",
								name_ar: "شؤون المرضى",
							},
							serving: [
								{
									queueNumber: "A001",
									counter: 1,
									status: "serving",
								},
							],
							waiting: [
								{
									queueNumber: "A002",
									status: "waiting",
								},
							],
						},
						description: "Department-specific display data",
					},
					all_departments: {
						value: {
							departments: [
								{
									id: "dept-1",
									name_en: "Patient Affairs",
									queues: [
										/* same structure as above */
									],
								},
								{
									id: "dept-2",
									name_en: "Laboratory",
									queues: [],
								},
							],
						},
						description: "All-departments display data",
					},
				},
			},
		},
	})
	async getQueueDisplay(@Query("code") code: string) {
		return this.displayService.getQueueDisplayByCode(code)
	}

	@Patch("code/:id")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("admin")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Update display access code"})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Access code updated successfully",
		schema: {
			example: {
				id: "uuid",
				department_id: "uuid",
				access_code: "XYZ789",
				is_active: true,
			},
		},
	})
	async updateCode(@Param("id") id: string, @Body() updateDto: UpdateDisplayCodeDto) {
		return this.displayService.updateAccessCode(id, updateDto)
	}

	@Get("codes")
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles("admin")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Get all display access codes"})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "List of all access codes",
		content: {
			"application/json": {
				example: {
					codes: [
						{
							id: "uuid",
							department_id: "uuid",
							access_code: "ABC123",
							is_active: true,
							created_at: "2024-01-31T10:00:00Z",
							department: {
								id: "uuid",
								name_en: "Patient Affairs",
								name_ar: "شؤون المرضى",
							},
						},
						{
							id: "uuid2",
							department_id: "all",
							access_code: "XYZ789",
							is_active: true,
							created_at: "2024-01-31T11:00:00Z",
							department: null,
						},
					],
				},
			},
		},
	})
	async getAllAccessCodes() {
		return {codes: await this.displayService.getAllAccessCodes()}
	}
}
