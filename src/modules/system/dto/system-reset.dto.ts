import {IsString, IsNotEmpty} from "class-validator"

export class SystemResetDto {
	@IsString()
	@IsNotEmpty()
	confirmationCode: string // Additional safety measure
}
