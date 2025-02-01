import {Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Param, Query, Patch} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse} from "@nestjs/swagger"
import {DisplayService} from "./display.service"
import {GenerateDisplayCodeDto} from "./dto/generate-display-code.dto"
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard"
import {RolesGuard} from "../common/guards/roles.guard"
import {Roles} from "../common/decorators/roles.decorator"
import {VerifyDisplayCodeDto} from "./dto/verify-display-code.dto"
import {Public} from "../../common/decorators/public.decorator"
import {UpdateDisplayCodeDto} from "./dto/update-display-code.dto"

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
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Code generated successfully",
		content: {
			"application/json": {
				examples: {
					specific: {
						value: {
							id: "uuid",
							department_id: "123e4567-e89b-12d3-a456-426614174000",
							access_code: "ABC123",
							is_active: true,
							created_at: "2024-01-31T10:00:00Z",
						},
						summary: "Department specific code",
					},
					all: {
						value: {
							id: "uuid",
							department_id: "all",
							access_code: "XYZ789",
							is_active: true,
							created_at: "2024-01-31T10:00:00Z",
						},
						summary: "All departments code",
					},
				},
			},
		},
	})
	@ApiResponse({status: HttpStatus.FORBIDDEN, description: "Admin access required"})
	async generateCode(@Body() dto: GenerateDisplayCodeDto) {
		return this.displayService.generateAccessCode(dto.department_id)
	}

	@Post("code/verify")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Verify display access code"})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Code verified successfully",
		schema: {
			example: {
				valid: true,
				department: {
					id: "uuid",
					name_en: "Radiology",
					name_ar: "قسم الأشعة",
				},
			},
		},
	})
	@ApiResponse({status: HttpStatus.NOT_FOUND, description: "Invalid access code"})
	async verifyCode(@Body() verifyDto: VerifyDisplayCodeDto) {
		return this.displayService.verifyAccessCode(verifyDto.code)
	}

	@Get("queue/:departmentId")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Get current display data for department"})
	@ApiResponse({
		status: HttpStatus.OK,
		description: "Current display data",
		schema: {
			example: {
				current: {
					queueNumber: "P001",
					patientName: "John Doe",
					counter: 1,
					status: "called",
				},
				next: ["P002", "P003"], // Optional: Show next in line
			},
		},
	})
	async getDepartmentDisplay(@Param("departmentId") departmentId: string, @Query("code") code: string) {
		return this.displayService.getDepartmentDisplay(departmentId, code)
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
