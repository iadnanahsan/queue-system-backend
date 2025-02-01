import {IsString, Length} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class VerifyDisplayCodeDto {
    @ApiProperty({
        example: "ABC123",
        description: "6-character display access code"
    })
    @IsString()
    @Length(6, 6)
    code: string
} 