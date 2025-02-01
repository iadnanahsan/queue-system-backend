import {ExtractJwt, Strategy} from "passport-jwt"
import {PassportStrategy} from "@nestjs/passport"
import {Injectable} from "@nestjs/common"
import {ConfigService} from "@nestjs/config"
import {JwtPayload} from "../../common/interfaces/jwt-payload.interface"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private configService: ConfigService) {
		const jwtSecret = configService.get<string>("JWT_SECRET")
		if (!jwtSecret) {
			throw new Error("JWT_SECRET must be defined in environment variables")
		}

		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtSecret,
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
