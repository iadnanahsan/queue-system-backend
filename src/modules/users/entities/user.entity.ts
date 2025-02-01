import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn} from "typeorm"
import {Department} from "../../departments/entities/department.entity"
import {UserRole} from "../enums/user-role.enum"

@Entity("users")
export class User {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({unique: true, length: 100})
	username: string

	@Column({length: 255})
	password_hash: string

	@Column({type: "enum", enum: UserRole})
	role: UserRole

	@Column({nullable: true})
	department_id?: string

	@Column({default: true})
	is_active: boolean

	@Column({nullable: true})
	last_login?: Date

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department)
	department?: Department
}
