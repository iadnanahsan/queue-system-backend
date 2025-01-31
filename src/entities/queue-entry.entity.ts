import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "./department.entity"
import {Counter} from "./counter.entity"

@Entity("queue_entries")
export class QueueEntry {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({type: "varchar", length: 10})
	queue_number: string

	@Column({type: "varchar", length: 50})
	file_number: string

	@Column({type: "varchar", length: 100})
	patient_name: string

	@Column({type: "uuid"})
	department_id: string

	@Column({type: "int", nullable: true})
	counter_id: number

	@Column({
		type: "varchar",
		length: 20,
		default: "waiting",
		enum: ["waiting", "serving", "completed", "no_show"],
	})
	status: string

	@CreateDateColumn()
	created_at: Date

	@Column({type: "timestamp", nullable: true})
	served_at: Date

	@Column({type: "timestamp", nullable: true})
	completed_at: Date

	@Column({type: "timestamp", nullable: true})
	no_show_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department

	@ManyToOne(() => Counter)
	@JoinColumn({name: "counter_id"})
	counter: Counter
}
