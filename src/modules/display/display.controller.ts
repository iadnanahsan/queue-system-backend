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
		summary: "Generate display access code",
		description: "Generate access code for specific department or all departments",
	})
	async generateCode(@Body() dto: GenerateDisplayCodeDto) {
		return this.displayService.generateAccessCode(dto.department_id)
	}

	@Get("queue")
	@Public()
	@ApiOperation({
		summary: "Access department display screen",
		description: "Access department's public waiting area display using access code",
	})
	@ApiQuery({
		name: "code",
		required: true,
		description: "Department display access code",
	})
	@ApiResponse({
		status: 200,
		description: "Department queue display data",
		type: DepartmentQueueDisplay,
	})
	async getQueueDisplay(@Query("code") code: string) {
		return this.displayService.getQueueDisplayByCode(code)
	}

	@Get("queue/all")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Get all departments queue data"})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "All departments display data",
		schema: {
			example: {
				departments: [
					{
						departmentId: "uuid",
						name_en: "Patient Affairs",
						name_ar: "شؤون المرضى",
						queues: [
							{
								counter: 1,
								current: {
									queueNumber: "A001",
									patientName: "John Doe",
									counter: 1,
									status: "called",
								},
							},
						],
					},
				],
			},
		},
	})
	async getAllDepartmentsDisplay(@Query("code") code: string) {
		return this.displayService.getAllDepartmentsDisplay(code)
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
