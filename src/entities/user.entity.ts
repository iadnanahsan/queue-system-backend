import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToOne} from "typeorm"
import {Department} from "./department.entity"
import {Counter} from "./counter.entity"
import {UserRole} from "../modules/users/enums/user-role.enum"

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
		enum: UserRole,
	})
	role: UserRole

	@Column({type: "uuid", nullable: true})
	department_id?: string

	@Column({name: "counter_id", type: "int", nullable: true})
	counter_id?: number

	@Column({type: "boolean", default: true})
	is_active: boolean

	@Column({type: "timestamp", nullable: true})
	last_login?: Date

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department?: Department

	@OneToOne(() => Counter)
	@JoinColumn({name: "counter_id"})
	counter?: Counter
}
