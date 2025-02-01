import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn} from "typeorm"
import {Department} from "../../departments/entities/department.entity"
import {QueueEntry} from "../../queue/entities/queue-entry.entity"

@Entity("counters")
export class Counter {
	@PrimaryGeneratedColumn()
	id: number

	@Column()
	number: number

	@Column()
	department_id: string

	@Column({default: true})
	is_active: boolean

	@Column({nullable: true})
	last_active: Date

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department)
	department: Department

	@OneToMany(() => QueueEntry, (queueEntry) => queueEntry.counter)
	queueEntries: QueueEntry[]
}
