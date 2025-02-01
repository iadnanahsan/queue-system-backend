import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "../../../entities/department.entity"
import {Counter} from "../../../entities/counter.entity"
import {QueueStatus} from "../enums/queue-status.enum"

@Entity("queue_entries")
export class QueueEntry {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({name: "queue_number", length: 10})
	queueNumber: string // Format: P001, X001, etc.

	@Column({name: "file_number", length: 50})
	fileNumber: string

	@Column({name: "patient_name", length: 100})
	patientName: string

	@Column({name: "department_id"})
	departmentId: string

	@Column({name: "counter_id", type: "int", nullable: true})
	counterId?: number

	@Column({
		type: "enum",
		enum: QueueStatus,
		default: QueueStatus.WAITING,
	})
	status: QueueStatus

	@CreateDateColumn({name: "created_at"})
	createdAt: Date

	@Column({name: "served_at", type: "timestamp", nullable: true})
	servedAt?: Date

	@Column({name: "completed_at", type: "timestamp", nullable: true})
	completedAt?: Date

	@Column({name: "no_show_at", type: "timestamp", nullable: true})
	noShowAt?: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department

	@ManyToOne(() => Counter)
	@JoinColumn({name: "counter_id"})
	counter?: Counter
}
