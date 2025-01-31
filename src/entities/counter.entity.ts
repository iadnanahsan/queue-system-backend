import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "./department.entity"

@Entity("counters")
export class Counter {
	@PrimaryGeneratedColumn("increment")
	id: number

	@Column({type: "uuid"})
	department_id: string

	@Column({type: "int"})
	number: number

	@Column({type: "boolean", default: true})
	is_active: boolean

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department
}
