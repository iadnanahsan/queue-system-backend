import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn} from "typeorm"
import {Department} from "../../../entities/department.entity"
import {DisplayType} from "../enums/display-type.enum"

@Entity("display_access_codes")
export class DisplayAccess {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({
		name: "department_id",
		type: "uuid",
		nullable: true,
	})
	departmentId: string | null

	@Column({
		name: "access_code",
		length: 10,
		unique: true,
	})
	access_code: string

	@Column({
		name: "display_type",
		type: "enum",
		enum: DisplayType,
	})
	display_type: DisplayType

	@Column({
		name: "is_active",
		default: true,
	})
	is_active: boolean

	@CreateDateColumn()
	created_at: Date

	@ManyToOne(() => Department, {nullable: true})
	@JoinColumn({name: "department_id"})
	department: Department
}
