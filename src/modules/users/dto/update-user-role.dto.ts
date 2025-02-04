import {IsEnum, IsOptional, IsUUID} from "class-validator"
import {ApiProperty, ApiPropertyOptional} from "@nestjs/swagger"
import {UserRole} from "../enums/user-role.enum"

export class UpdateUserRoleDto {
	@ApiProperty({
		enum: UserRole,
		description: "New role for the user",
		example: UserRole.COUNTER_STAFF,
		enumName: "UserRole",
	})
	@IsEnum(UserRole)
	role: UserRole

	@ApiPropertyOptional({
		description: "Department ID (required for counter_staff role)",
		example: "240d169e-83de-4932-837c-42de45f56fee",
		type: "string",
		format: "uuid",
		nullable: true,
	})
	@IsOptional()
	@IsUUID()
	department_id?: string // Matches DB column name
}
