import {IsEnum, IsOptional, IsUUID, IsNumber, Min} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {UserRole} from "../enums/user-role.enum"
import {Type} from "class-transformer"

export class GetUsersDto {
	@ApiProperty({required: false})
	@IsOptional()
	@IsEnum(UserRole)
	role?: UserRole

	@ApiProperty({required: false})
	@IsOptional()
	@IsUUID()
	department_id?: string

	@ApiProperty({required: false, default: 1})
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	page: number = 1

	@ApiProperty({required: false, default: 10})
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@Min(1)
	limit: number = 10

	@ApiProperty({required: false})
	@IsOptional()
	search?: string
}
