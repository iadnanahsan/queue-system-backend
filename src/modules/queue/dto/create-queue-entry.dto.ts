import {IsString, IsUUID} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class CreateQueueEntryDto {
	@ApiProperty({example: "2d13a303-94b3-40a9-b6cd-92d369019d96"})
	@IsUUID()
	department_id: string

	@ApiProperty({example: "F12345"})
	@IsString()
	file_number: string

	@ApiProperty({example: "John Doe"})
	@IsString()
	patient_name: string
}
