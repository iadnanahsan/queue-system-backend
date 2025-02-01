import {ApiProperty} from "@nestjs/swagger"

export class CounterResponse {
	@ApiProperty({example: "uuid"})
	id: string

	@ApiProperty({example: 1})
	number: number

	@ApiProperty({example: "uuid"})
	department_id: string

	@ApiProperty({example: true})
	is_active: boolean

	@ApiProperty()
	last_active: Date
}
