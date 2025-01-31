export interface LoginResponse {
	access_token: string
	user: {
		id: string
		username: string
		role: string
		departmentId?: string
	}
}

export interface UserFromAuth {
	id: string
	username: string
	password_hash: string
	role: string
	department_id?: string
}
