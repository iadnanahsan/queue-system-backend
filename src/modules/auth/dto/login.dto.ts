import {IsString, MinLength} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class LoginDto {
	@ApiProperty({example: "staff1"})
	@IsString()
	username: string

	@ApiProperty({example: "password123"})
	@IsString()
	@MinLength(8)
	password: string
}
