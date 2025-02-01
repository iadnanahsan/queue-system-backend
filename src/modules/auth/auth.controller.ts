import {Controller, Post, Body, HttpCode, HttpStatus} from "@nestjs/common"
import {ApiTags, ApiOperation, ApiResponse} from "@nestjs/swagger"
import {AuthService} from "./auth.service"
import {LoginDto} from "./dto/login.dto"

@ApiTags("auth")
@Controller("auth")
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post("login")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({summary: "Login user"})
	@ApiResponse({status: HttpStatus.OK, description: "Login successful"})
	@ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "Invalid credentials"})
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto)
	}
}
