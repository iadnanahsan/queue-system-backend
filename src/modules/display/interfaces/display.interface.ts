import {ApiProperty} from "@nestjs/swagger"
import {DisplayType} from "../enums/display-type.enum"

// Base response interface
export interface DisplayResponse<T> {
	display_type: DisplayType
	data: T
}

// Existing interfaces for the data
export interface DepartmentDisplay {
	department: {
		name_en: string
		name_ar: string
	}
	serving: Array<{
		counter: number
		queueNumber: string
		patientName: string
		fileNumber: string
		status: string
	}>
	waiting: string[]
}

export interface AllDepartmentsDisplay {
	departmentId: string
	name_en: string
	name_ar: string
	queues: Array<{
		counter: number
		current: {
			queueNumber: string
			counter: number
			status: string
		} | null
		waiting: number
	}>
}

// Type aliases for the full response types
export type DepartmentQueueDisplay = DisplayResponse<DepartmentDisplay>
export type MultiDepartmentDisplay = DisplayResponse<AllDepartmentsDisplay[]>

// Keep the DTO for Swagger
export class DepartmentQueueDisplayDto {
	@ApiProperty({
		example: {
			name_en: "Cardiology",
			name_ar: "قسم القلب",
		},
	})
	department: {
		name_en: string
		name_ar: string
	}

	@ApiProperty({
		example: [
			{
				counter: 1,
				queueNumber: "P001",
				patientName: "John Doe",
				fileNumber: "FILE123",
				status: "serving",
			},
		],
	})
	serving: Array<{
		counter: number
		queueNumber: string
		patientName: string
		fileNumber: string
		status: string
	}>

	@ApiProperty({
		example: ["P002", "P003", "P004"],
	})
	waiting: string[]
}
