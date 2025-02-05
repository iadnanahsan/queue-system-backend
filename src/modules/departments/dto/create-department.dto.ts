import {IsString, IsNotEmpty, IsBoolean, IsOptional} from "class-validator"
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger"

export class CreateDepartmentDto {
	@ApiProperty({
		description: "Department name in English",
		example: "Cardiology",
	})
	@IsString()
	@IsNotEmpty()
	name_en: string

	@ApiProperty({
		description: "Department name in Arabic",
		example: "قسم القلب",
	})
	@IsString()
	@IsNotEmpty()
	name_ar: string

	@ApiProperty({
		description: "Department prefix for queue numbers",
		example: "C",
	})
	@IsString()
	@IsNotEmpty()
	prefix: string

	@ApiPropertyOptional({
		description: "Department active status",
		default: true,
	})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean = true
}
