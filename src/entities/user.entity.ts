import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "./department.entity"

@Entity("users")
export class User {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({type: "varchar", length: 100, unique: true})
	username: string

	@Column({type: "varchar", length: 255})
	password_hash: string

	@Column({
		type: "varchar",
		length: 20,
		enum: ["admin", "receptionist", "counter_staff"],
	})
	role: string

	@Column({type: "uuid", nullable: true})
	department_id: string

	@Column({type: "int", nullable: true})
	counter_id: number

	@Column({type: "boolean", default: true})
	is_active: boolean

	@Column({type: "timestamp", nullable: true})
	last_login: Date

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department
}
