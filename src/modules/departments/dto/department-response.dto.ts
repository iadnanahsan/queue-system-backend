import {ApiProperty} from "@nestjs/swagger"

export class DepartmentResponseDto {
	@ApiProperty({example: "uuid"})
	id: string

	@ApiProperty({example: "Radiology"})
	name_en: string

	@ApiProperty({example: "قسم الأشعة"})
	name_ar: string

	@ApiProperty({example: "R"})
	prefix: string

	@ApiProperty({example: true})
	is_active: boolean
}
