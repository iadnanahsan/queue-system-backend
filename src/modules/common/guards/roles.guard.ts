import {Injectable, CanActivate, ExecutionContext, ForbiddenException} from "@nestjs/common"
import {Reflector} from "@nestjs/core"
import {ROLES_KEY} from "../decorators/roles.decorator"

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])

		if (!requiredRoles) {
			return true
		}

		const {user} = context.switchToHttp().getRequest()
		const hasRole = requiredRoles.includes(user.role)

		if (!hasRole) {
			throw new ForbiddenException(
				`Access denied. This action requires ${requiredRoles.join(" or ")} role. Your role: ${user.role}`
			)
		}

		return true
	}
}
