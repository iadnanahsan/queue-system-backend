import {IsNumber, IsOptional, IsBoolean, Min, IsUUID} from "class-validator"
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger"

export class UpdateCounterDto {
	@ApiProperty({
		example: 1,
		description: "Counter number within department",
		minimum: 1,
		required: false,
	})
	@IsNumber({}, {message: "Number must be a valid number"})
	@Min(1, {message: "Number must be at least 1"})
	@ApiPropertyOptional()
	@IsNumber()
	@IsOptional()
	number?: number

	@ApiProperty({
		example: "2d13a303-94b3-40a9-b6cd-92d369019d96",
		description: "Department UUID",
		required: false,
	})
	@IsUUID("4", {message: "Department ID must be a valid UUID"})
	@ApiPropertyOptional()
	@IsBoolean()
	@IsOptional()
	is_active?: boolean

	@ApiPropertyOptional()
	@IsOptional()
	department_id?: string
}
