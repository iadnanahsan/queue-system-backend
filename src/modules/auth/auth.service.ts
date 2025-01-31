import {Injectable, UnauthorizedException} from "@nestjs/common"
import {JwtService} from "@nestjs/jwt"
import {LoginDto} from "./dto/login.dto"
import {UsersService} from "../users/users.service"
import {LoginResponse, UserFromAuth} from "./interfaces/auth.interfaces"
import {JwtPayload} from "../common/interfaces/jwt-payload.interface"
import * as bcrypt from "bcryptjs"

@Injectable()
export class AuthService {
	constructor(private usersService: UsersService, private jwtService: JwtService) {}

	async validateUser(loginDto: LoginDto): Promise<UserFromAuth> {
		const user = await this.usersService.findByUsername(loginDto.username)
		if (!user) {
			throw new UnauthorizedException("Invalid credentials")
		}

		const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash)
		if (!isPasswordValid) {
			throw new UnauthorizedException("Invalid credentials")
		}

		return user
	}

	async login(user: UserFromAuth): Promise<LoginResponse> {
		const payload: JwtPayload = {
			sub: user.id,
			username: user.username,
			role: user.role,
			departmentId: user.department_id,
		}

		return {
			access_token: this.jwtService.sign(payload),
			user: {
				id: user.id,
				username: user.username,
				role: user.role,
				departmentId: user.department_id,
			},
		}
	}
}
