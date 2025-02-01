import {IsNotEmpty, IsString, IsUUID} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class UpdateDepartmentDto {
	@ApiProperty({
		description: "The UUID of the department",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@IsNotEmpty()
	@IsUUID()
	departmentId: string
}
