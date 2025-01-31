export interface JwtPayload {
	sub: string
	username: string
	role: string
	departmentId?: string
	iat?: number
	exp?: number
}
