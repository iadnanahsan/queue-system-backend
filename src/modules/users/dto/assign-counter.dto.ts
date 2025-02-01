import {IsNumber} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class AssignCounterDto {
	@ApiProperty({
		description: "Counter ID to assign to staff",
		example: 1,
	})
	@IsNumber()
	counterId: number
}
