import {Controller, Post, Body, UseGuards} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiResponse} from "@nestjs/swagger"
import {AuthService} from "./auth.service"
import {LoginDto} from "./dto/login.dto"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post("login")
	@ApiOperation({summary: "Login user"})
	@ApiResponse({status: 200, description: "Login successful"})
	@ApiResponse({status: 401, description: "Invalid credentials"})
	async login(@Body() loginDto: LoginDto) {
		const user = await this.authService.validateUser(loginDto)
		return this.authService.login(user)
	}
}
