import {IsBoolean, IsOptional, IsString, IsUUID} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {ALL_DEPARTMENTS_ID} from "../constants/display.constants"

export class UpdateDisplayCodeDto {
	@ApiProperty({
		description: "Generate new access code",
		required: false,
		example: true,
	})
	@IsBoolean()
	@IsOptional()
	regenerate?: boolean

	@ApiProperty({
		description: "Activate/deactivate code",
		required: false,
		example: true,
	})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean

	@ApiProperty({
		description: "New department ID or 'all'",
		required: false,
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@IsString()
	@IsOptional()
	department_id?: string
}
