import {IsNotEmpty, IsEnum} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {DisplayType} from "../enums/display-type.enum"
import {ALL_DEPARTMENTS_ID} from "../constants/display.constants"
import {IsUUIDOrAll} from "../validators/is-uuid-or-all.validator"
import {IsDisplayTypeConsistent} from "../validators/display-type-consistency.validator"

export class GenerateDisplayCodeDto {
	@ApiProperty({
		description: "Department ID or 'ALL' for all departments",
		example: ALL_DEPARTMENTS_ID,
	})
	@IsNotEmpty({message: "Department ID is required"})
	@IsUUIDOrAll({
		message: "Department ID must be a valid UUID or 'ALL'",
	})
	departmentId: string

	@ApiProperty({
		enum: DisplayType,
		example: DisplayType.DEPARTMENT_SPECIFIC,
		description: "Type of display access",
	})
	@IsEnum(DisplayType)
	@IsDisplayTypeConsistent()
	display_type: DisplayType
}
