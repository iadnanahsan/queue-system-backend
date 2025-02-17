import {IsString, IsBoolean, IsOptional, IsEnum} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {DisplayType} from "../enums/display-type.enum"
import {ALL_DEPARTMENTS_ID} from "../constants/display.constants"

export class UpdateDisplayCodeDto {
	@ApiProperty({
		description: "Department ID to reassign the display code. Can be specific UUID or ALL_DEPARTMENTS_ID",
		examples: {
			specific: {
				value: "123e4567-e89b-12d3-a456-426614174000",
				description: "Assign to specific department",
			},
			all: {
				value: ALL_DEPARTMENTS_ID,
				description: "Assign to all departments view",
			},
		},
		required: false,
	})
	@IsString()
	@IsOptional()
	department_id?: string

	@ApiProperty({
		description: "Generate new access code while keeping other settings",
		example: true,
		required: false,
	})
	@IsBoolean()
	@IsOptional()
	regenerate?: boolean

	@ApiProperty({
		description: "Activate or deactivate the display code",
		example: true,
		required: false,
	})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean

	@ApiProperty({
		description: "Change display type. Affects how queues are shown",
		enum: DisplayType,
		examples: {
			specific: {
				value: DisplayType.DEPARTMENT_SPECIFIC,
				description: "Show only specified department",
			},
			all: {
				value: DisplayType.ALL_DEPARTMENTS,
				description: "Show all departments",
			},
		},
		required: false,
	})
	@IsEnum(DisplayType)
	@IsOptional()
	display_type?: DisplayType
}
