import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn} from "typeorm"
import {DisplayType} from "../enums/display-type.enum"

@Entity("display_access_codes")
export class DisplayAccess {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({
		name: "department_ids",
		type: "text",
		array: true,
		nullable: true,
	})
	departmentIds: string[]

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
}
