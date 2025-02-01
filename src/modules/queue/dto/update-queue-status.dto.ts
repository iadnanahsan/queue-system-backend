import {IsEnum} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"
import {QueueStatus} from "../enums/queue-status.enum"

export class UpdateQueueStatusDto {
    @ApiProperty({
        enum: QueueStatus,
        description: "New status for queue entry",
        example: "completed"
    })
    @IsEnum(QueueStatus)
    status: QueueStatus
} 