import {IsString, IsUUID, IsOptional, IsBoolean} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class RegisterPatientDto {
	@ApiProperty()
	@IsUUID()
	departmentId: string

	@ApiProperty()
	@IsString()
	fileNumber: string

	@ApiProperty()
	@IsString()
	patientName: string

	@ApiProperty({required: false})
	@IsBoolean()
	@IsOptional()
	priority?: boolean
}
