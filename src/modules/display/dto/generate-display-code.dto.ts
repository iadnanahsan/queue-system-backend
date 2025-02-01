import {IsString} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {ALL_DEPARTMENTS_ID} from "../constants/display.constants"

export class GenerateDisplayCodeDto {
	@ApiProperty({
		description: "Department ID or 'all' for all departments access",
		examples: {
			specific: {
				value: "123e4567-e89b-12d3-a456-426614174000",
				description: "For specific department",
			},
			all: {
				value: ALL_DEPARTMENTS_ID,
				description: "For all departments",
			},
		},
	})
	@IsString()
	department_id: string
}
