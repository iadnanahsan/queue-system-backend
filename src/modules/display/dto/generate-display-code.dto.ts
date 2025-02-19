import {IsNotEmpty, IsEnum, IsArray, ValidateIf} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {DisplayType} from "../enums/display-type.enum"
import {IsUUID} from "class-validator"
import {Validate} from "class-validator"
import {DisplayTypeDepartmentsValidator} from "../validators/display-type-departments.validator"

export class GenerateDisplayCodeDto {
	@ApiProperty({
		description: "Array of department IDs to be included in the display",
		type: [String],
		required: false,
		examples: {
			specific: {
				value: ["123e4567-e89b-12d3-a456-426614174000"],
				description: "Single department for DEPARTMENT_SPECIFIC type",
			},
			multiple: {
				value: ["123e4567-e89b-12d3-a456-426614174000", "987fcdeb-89ab-12d3-a456-426614174000"],
				description: "Multiple departments for MULTIPLE_DEPARTMENTS type",
			},
			all: {
				value: undefined,
				description: "Omit this field for ALL_DEPARTMENTS type",
			},
		},
	})
	@IsArray()
	@IsUUID("4", {each: true})
	@ValidateIf(
		(o) => o.display_type !== DisplayType.ALL_DEPARTMENTS || (o.departmentIds && o.departmentIds.length > 0)
	)
	@Validate(DisplayTypeDepartmentsValidator)
	departmentIds?: string[]

	@ApiProperty({
		enum: DisplayType,
		description: "Type of display access",
	})
	@IsEnum(DisplayType)
	display_type: DisplayType
}
