import {IsNumber, IsNotEmpty} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class ServePatientDto {
	@ApiProperty({
		description: "ID of the counter that will serve this patient",
		example: 1,
		type: "number",
		required: true,
	})
	@IsNumber()
	@IsNotEmpty()
	counterId: number
}
