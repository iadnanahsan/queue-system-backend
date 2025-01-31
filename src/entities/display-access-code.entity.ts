import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "./department.entity"

@Entity("display_access_codes")
export class DisplayAccessCode {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({type: "uuid"})
	department_id: string

	@Column({type: "varchar", length: 50, unique: true})
	access_code: string

	@Column({type: "boolean", default: true})
	is_active: boolean

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department
}
