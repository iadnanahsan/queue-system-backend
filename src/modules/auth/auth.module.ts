import {Module} from "@nestjs/common"
import {JwtModule} from "@nestjs/jwt"
import {ConfigModule, ConfigService} from "@nestjs/config"
import {AuthService} from "./auth.service"
import {AuthController} from "./auth.controller"
import {JwtStrategy} from "./strategies/jwt.strategy"
import {UsersModule} from "../users/users.module"
import {TypeOrmModule} from "@nestjs/typeorm"
import {User} from "../../entities/user.entity"

@Module({
	imports: [
		UsersModule,
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("JWT_SECRET"),
				signOptions: {
					expiresIn: configService.get<string>("JWT_EXPIRES_IN", "8h"),
				},
			}),
			inject: [ConfigService],
		}),
		TypeOrmModule.forFeature([User]),
	],
	providers: [AuthService, JwtStrategy],
	controllers: [AuthController],
	exports: [AuthService, JwtModule],
})
export class AuthModule {}
