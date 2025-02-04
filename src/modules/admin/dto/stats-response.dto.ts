import {ApiProperty} from "@nestjs/swagger"

export class QueueStatsDto {
	@ApiProperty({description: "Total number of queue entries"})
	total: number

	@ApiProperty({description: "Queue entries created today"})
	today: number

	@ApiProperty({description: "Currently waiting patients"})
	waiting: number

	@ApiProperty({description: "Total completed patients"})
	completed: number

	@ApiProperty({description: "Total no-show patients"})
	noShows: number
}

export class AdminStatsResponseDto {
	@ApiProperty({description: "Total number of departments"})
	departments: number

	@ApiProperty({description: "Total number of counters"})
	counters: number

	@ApiProperty({description: "Queue statistics"})
	queues: QueueStatsDto

	@ApiProperty({description: "Total number of users"})
	users: number
}
