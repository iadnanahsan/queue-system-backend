import {ApiProperty} from "@nestjs/swagger"
import {UserRole} from "../enums/user-role.enum"

export class UserResponse {
	@ApiProperty({example: "uuid"})
	id: string

	@ApiProperty({example: "john.doe"})
	username: string

	@ApiProperty({enum: UserRole})
	role: UserRole

	@ApiProperty({example: "uuid", required: false})
	department_id?: string

	@ApiProperty({example: true})
	is_active: boolean
}
