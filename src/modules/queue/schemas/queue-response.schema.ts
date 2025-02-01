import {ApiProperty} from "@nestjs/swagger"

export class QueueEntryResponse {
	@ApiProperty({example: "uuid"})
	id: string

	@ApiProperty({example: "X-001"})
	queue_number: string

	@ApiProperty({example: "John Doe"})
	patient_name: string

	@ApiProperty({example: "12345", required: false})
	file_number?: string

	@ApiProperty({example: "waiting"})
	status: string

	@ApiProperty()
	created_at: Date

	@ApiProperty({required: false})
	served_at?: Date

	@ApiProperty({required: false})
	completed_at?: Date
}
