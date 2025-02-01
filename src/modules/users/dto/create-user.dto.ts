import {IsString, Length, IsEnum, IsUUID, IsOptional, IsBoolean, IsNumber} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {UserRole} from "../enums/user-role.enum"
import {ValidateIf} from "class-validator"

export class CreateUserDto {
	@ApiProperty({
		example: "counter1",
		description: "Username for login",
	})
	@IsString()
	@Length(3, 100)
	username: string

	@ApiProperty({
		example: "counter123",
		description: "User's password (will be hashed)",
	})
	@IsString()
	@Length(6, 20)
	password: string

	@ApiProperty({
		enum: UserRole,
		example: UserRole.COUNTER_STAFF,
		description: "User's role in the system",
	})
	@IsEnum(UserRole)
	role: UserRole

	@ApiProperty({
		required: false,
		description: "Department ID (required only for counter_staff)",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@IsUUID()
	@IsOptional()
	department_id?: string

	@ApiProperty({
		example: true,
		required: false,
		description: "Whether the user account is active",
		default: true,
	})
	@IsBoolean()
	@IsOptional()
	is_active?: boolean = true

	@ApiProperty({
		required: false,
		description: "Counter ID (required for counter_staff)",
		example: 1,
	})
	@IsNumber()
	@IsOptional()
	@ValidateIf((o) => o.role === UserRole.COUNTER_STAFF)
	counter_id?: number
}
