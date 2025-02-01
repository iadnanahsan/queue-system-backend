import {User} from "../../../entities/user.entity"

export type UserFromAuth = Pick<
	User,
	"id" | "username" | "password_hash" | "role" | "department_id" | "counter_id" | "last_login"
>

export interface LoginResponse {
	access_token: string
	user: {
		id: string
		username: string
		role: string
		departmentId?: string
	}
}
