import {IsString, IsUUID, Length} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class CreateQueueDto {
	@ApiProperty({
		description: "Queue number",
		example: "A-001",
	})
	@IsString()
	queueNumber: string

	@ApiProperty({
		description: "Patient file number",
		example: "F12345",
	})
	@IsString()
	@Length(4, 50)
	fileNumber: string

	@ApiProperty({
		description: "Patient name",
		example: "John Doe",
	})
	@IsString()
	@Length(2, 100)
	patientName: string

	@ApiProperty({
		description: "Department ID",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@IsUUID()
	departmentId: string
}
