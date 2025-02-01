import {IsString, Length} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class UpdatePasswordDto {
	@ApiProperty({
		example: "newPassword123",
		description: "New password for the user",
	})
	@IsString()
	@Length(6, 20)
	newPassword: string
}
