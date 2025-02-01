import {Injectable, UnauthorizedException} from "@nestjs/common"
import {JwtService} from "@nestjs/jwt"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {User} from "../../entities/user.entity"
import {LoginDto} from "./dto/login.dto"
import {UsersService} from "../users/users.service"
import {LoginResponse} from "./interfaces/auth.interfaces"
import {JwtPayload} from "../common/interfaces/jwt-payload.interface"
import * as bcrypt from "bcryptjs"

@Injectable()
export class AuthService {
	constructor(
		private usersService: UsersService,
		private jwtService: JwtService,
		@InjectRepository(User)
		private userRepository: Repository<User>
	) {}

	async validateUser(loginDto: LoginDto): Promise<User> {
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

	async login(loginDto: LoginDto): Promise<LoginResponse> {
		const user = await this.validateUser(loginDto)
		if (!user) {
			throw new UnauthorizedException("Invalid credentials")
		}

		// Update last_login
		await this.userRepository.update(user.id, {
			last_login: new Date(),
		})

		const payload: JwtPayload = {
			username: user.username,
			sub: user.id,
			role: user.role,
			departmentId: user.department_id,
			counterId: user.counter_id,
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
