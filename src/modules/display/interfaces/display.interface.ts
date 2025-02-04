import {ApiProperty} from "@nestjs/swagger"

export class DepartmentQueueDisplay {
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
	serving: {
		counter: number
		queueNumber: string
		patientName: string
		fileNumber: string
		status: string
	}[]

	@ApiProperty({
		example: ["P002", "P003", "P004"],
	})
	waiting: string[]
}

export interface MultiDepartmentDisplay {
	departmentId: string
	name_en: string
	name_ar: string
	queues: {
		counter: number
		current: DepartmentQueueDisplay | null
	}[]
}
