import {IsDateString, IsOptional, IsUUID} from "class-validator"
import {ApiProperty} from "@nestjs/swagger"

export class GetQueueMetricsDto {
	@ApiProperty({
		description: "Start date for metrics (YYYY-MM-DD)",
		example: "2024-01-01",
	})
	@IsDateString()
	startDate: string

	@ApiProperty({
		description: "End date for metrics (YYYY-MM-DD)",
		example: "2024-01-31",
	})
	@IsDateString()
	endDate: string

	@ApiProperty({
		description: "Department ID (optional)",
		required: false,
	})
	@IsOptional()
	@IsUUID()
	departmentId?: string
}
