import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "../../../entities/department.entity"

@Entity("display_access_codes")
export class DisplayAccess {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({name: "department_id"})
	departmentId: string  // Can be UUID or "all"

	@Column({length: 6, unique: true})
	access_code: string // Following schema from docs

	@Column({default: true})
	is_active: boolean

	@CreateDateColumn({name: "created_at"})
	created_at: Date

	@ManyToOne(() => Department)
	@JoinColumn({name: "department_id"})
	department: Department
}
