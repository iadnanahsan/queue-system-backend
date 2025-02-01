import {ExtractJwt, Strategy} from "passport-jwt"
import {PassportStrategy} from "@nestjs/passport"
import {Injectable} from "@nestjs/common"
import {ConfigService} from "@nestjs/config"
import {JwtPayload} from "../../common/interfaces/jwt-payload.interface"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private configService: ConfigService) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>("JWT_SECRET"),
		})
	}

	async validate(payload: JwtPayload) {
		return {
			id: payload.sub,
			username: payload.username,
			role: payload.role,
			departmentId: payload.departmentId,
		}
	}
}
