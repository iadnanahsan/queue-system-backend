import {Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Param, Query, Patch} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam, ApiBody} from "@nestjs/swagger"
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
		description: `Generate a new display access code with specified type:
		- DEPARTMENT_SPECIFIC: For showing a single department's queue
		- MULTIPLE_DEPARTMENTS: For showing selected departments' queues
		- ALL_DEPARTMENTS: For showing all departments' queues
		
		Note: 
		- Each department can have only one active department-specific display code
		- Only one active ALL_DEPARTMENTS display can exist at a time
		- For MULTIPLE_DEPARTMENTS, no duplicate department sets are allowed`,
	})
	@ApiResponse({
		status: HttpStatus.CREATED,
		description: "Display access code generated successfully",
		content: {
			"application/json": {
				examples: {
					department_specific: {
						summary: "Department Specific Display",
						description: "Display code for a single department",
						value: {
							id: "123e4567-e89b-12d3-a456-426614174000",
							departmentIds: ["64ff420a-eaac-4fd3-92da-a801f76b37c3"],
							access_code: "ABC123",
							display_type: "department_specific",
							is_active: true,
							created_at: "2024-02-18T10:00:00Z",
						},
					},
					multiple_departments: {
						summary: "Multiple Departments Display",
						description: "Display code for selected departments",
						value: {
							id: "987fcdeb-89ab-12d3-a456-426614174000",
							departmentIds: [
								"64ff420a-eaac-4fd3-92da-a801f76b37c3",
								"49b248c7-7722-43b8-800c-c52f47a1f6d6",
							],
							access_code: "XYZ789",
							display_type: "multiple_departments",
							is_active: true,
							created_at: "2024-02-18T10:15:00Z",
						},
					},
					all_departments: {
						summary: "All Departments Display",
						description: "Display code for all departments",
						value: {
							id: "456789ab-cdef-12d3-a456-426614174000",
							departmentIds: null,
							access_code: "DEF456",
							display_type: "all_departments",
							is_active: true,
							created_at: "2024-02-18T10:30:00Z",
						},
					},
				},
			},
		},
	})
	@ApiBody({
		description: "Display code generation request",
		examples: {
			department_specific: {
				summary: "Department Specific",
				description: "Create display for single department",
				value: {
					display_type: "department_specific",
					departmentIds: ["64ff420a-eaac-4fd3-92da-a801f76b37c3"],
				},
			},
			multiple_departments: {
				summary: "Multiple Departments",
				description: "Create display for selected departments",
				value: {
					display_type: "multiple_departments",
					departmentIds: ["64ff420a-eaac-4fd3-92da-a801f76b37c3", "49b248c7-7722-43b8-800c-c52f47a1f6d6"],
				},
			},
			all_departments: {
				summary: "All Departments",
				description: "Create display for all departments",
				value: {
					display_type: "all_departments",
				},
			},
		},
	})
	@ApiResponse({
		status: HttpStatus.BAD_REQUEST,
		description: "Invalid request or duplicate display code",
		content: {
			"application/json": {
				examples: {
					duplicate_department: {
						summary: "Duplicate Department Code",
						value: {
							message: "An active display code already exists for this department: ABC123",
							error: "Bad Request",
							statusCode: 400,
						},
					},
					duplicate_all: {
						summary: "Duplicate All Departments",
						value: {
							message: "An active all-departments display already exists with code: XYZ789",
							error: "Bad Request",
							statusCode: 400,
						},
					},
					invalid_type: {
						summary: "Invalid Display Type",
						value: {
							message: "All departments display must not include any department IDs",
							error: "Bad Request",
							statusCode: 400,
						},
					},
				},
			},
		},
	})
	async generateCode(@Body() dto: GenerateDisplayCodeDto) {
		return this.displayService.generateAccessCode(dto)
	}

	@Get("queue/:code")
	@Public()
	@ApiOperation({
		summary: "Get queue display data by access code",
		description: `Retrieves queue display data based on the display type:
		- DEPARTMENT_SPECIFIC: Shows queue for a single department
		- MULTIPLE_DEPARTMENTS: Shows queues for selected departments only
		- ALL_DEPARTMENTS: Shows queues for all departments`,
	})
	@ApiParam({
		name: "code",
		description: "Display access code",
		example: "ABC123",
	})
	@ApiResponse({
		status: 200,
		description: "Queue display data retrieved successfully",
		content: {
			"application/json": {
				examples: {
					department_specific: {
						summary: "Department Specific Display",
						description: "Queue data for a single department",
						value: {
							display_type: "department_specific",
							data: {
								department: {
									name_en: "Cardiology",
									name_ar: "قسم القلب",
								},
								serving: [
									{
										counter: 1,
										queueNumber: "C001",
										patientName: "John Doe",
										fileNumber: "FILE123",
										status: "serving",
									},
								],
								waiting: ["C002", "C003"],
							},
						},
					},
					multiple_departments: {
						summary: "Multiple Departments Display",
						description: "Queue data for selected departments",
						value: {
							display_type: "multiple_departments",
							departments: [
								{
									departmentId: "123e4567-e89b-12d3-a456-426614174000",
									department: {
										name_en: "Cardiology",
										name_ar: "قسم القلب",
									},
									serving: [
										{
											counter: 1,
											queueNumber: "C001",
											patientName: "John Doe",
											fileNumber: "FILE123",
											status: "serving",
										},
									],
									waiting: ["C002"],
								},
								{
									departmentId: "987fcdeb-89ab-12d3-a456-426614174000",
									department: {
										name_en: "Radiology",
										name_ar: "قسم الأشعة",
									},
									serving: [
										{
											counter: 1,
											queueNumber: "R001",
											patientName: "Jane Smith",
											fileNumber: "FILE456",
											status: "serving",
										},
									],
									waiting: ["R002", "R003"],
								},
							],
						},
					},
					all_departments: {
						summary: "All Departments Display",
						description: "Queue data for all departments",
						value: {
							display_type: "all_departments",
							data: [
								{
									departmentId: "123e4567-e89b-12d3-a456-426614174000",
									name_en: "Cardiology",
									name_ar: "قسم القلب",
									queues: [
										{
											counter: 1,
											current: {
												queueNumber: "C001",
												counter: 1,
												fileNumber: "FILE123",
												status: "serving",
											},
											waiting: 2,
										},
										{
											counter: 2,
											current: null,
											waiting: 1,
										},
									],
								},
								{
									departmentId: "987fcdeb-89ab-12d3-a456-426614174000",
									name_en: "Radiology",
									name_ar: "قسم الأشعة",
									queues: [
										{
											counter: 1,
											current: {
												queueNumber: "R001",
												counter: 1,
												fileNumber: "FILE789",
												status: "serving",
											},
											waiting: 3,
										},
									],
								},
								{
									departmentId: "d0a617b3-13ff-45bd-a998-d008f245dfae",
									name_en: "Gastroenterology",
									name_ar: "طب الجهاز الهضمي",
									queues: [
										{
											counter: 1,
											current: null,
											waiting: 133,
										},
									],
								},
							],
						},
					},
				},
			},
		},
	})
	@ApiResponse({
		status: 404,
		description: "Display code not found or inactive",
		content: {
			"application/json": {
				example: {
					message: "Display code not found or inactive",
					error: "Not Found",
					statusCode: 404,
				},
			},
		},
	})
	async getQueueDisplay(@Param("code") code: string) {
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
