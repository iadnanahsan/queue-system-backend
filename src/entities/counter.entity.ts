import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "./department.entity"

@Entity("counters")
export class Counter {
	@PrimaryGeneratedColumn()
	id: number

	@Column({name: "department_id", type: "uuid"})
	department_id: string

	@Column({type: "int"})
	number: number

	@Column({name: "is_active", type: "boolean", default: true})
	is_active: boolean

	@CreateDateColumn({name: "created_at"})
	created_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department
}
