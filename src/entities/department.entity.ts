import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany} from "typeorm"
import {User} from "./user.entity"
import {Counter} from "./counter.entity"
import {QueueEntry} from "./queue-entry.entity"

@Entity("departments")
export class Department {
	@PrimaryGeneratedColumn("uuid")
	id: string

	@Column({type: "varchar", length: 100})
	name_en: string

	@Column({type: "varchar", length: 100})
	name_ar: string

	@Column({type: "char", length: 1, unique: true})
	prefix: string

	@Column({type: "boolean", default: true})
	is_active: boolean

	@CreateDateColumn()
	created_at: Date

	@OneToMany(() => User, (user) => user.department)
	users: User[]

	@OneToMany(() => Counter, (counter) => counter.department)
	counters: Counter[]

	@OneToMany(() => QueueEntry, (entry) => entry.department)
	queueEntries: QueueEntry[]
}
