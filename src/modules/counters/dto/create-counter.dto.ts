import {IsNumber, IsUUID, Min} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class CreateCounterDto {
	@ApiProperty({
		example: 1,
		description: "Counter number within department",
		minimum: 1,
	})
	@IsNumber({}, {message: "Number must be a valid number"})
	@Min(1, {message: "Number must be at least 1"})
	number: number

	@ApiProperty({
		example: "2d13a303-94b3-40a9-b6cd-92d369019d96",
		description: "Department UUID",
	})
	@IsUUID("4", {message: "Department ID must be a valid UUID"})
	department_id: string
}
