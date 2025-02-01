import {IsString, Length, IsBoolean, IsOptional} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class CreateDepartmentDto {
	@ApiProperty({example: "Radiology"})
	@IsString()
	@Length(2, 100)
	name_en: string

	@ApiProperty({example: "قسم الأشعة"})
	@IsString()
	@Length(2, 100)
	name_ar: string

	@ApiProperty({example: "R"})
	@IsString()
	@Length(1, 1)
	prefix: string

	@ApiProperty({example: true, required: false})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean = true
}
