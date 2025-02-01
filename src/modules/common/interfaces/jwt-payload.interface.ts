export interface JwtPayload {
	username: string
	sub: string
	role: string
	departmentId?: string
	counterId?: number
	iat?: number
	exp?: number
}
