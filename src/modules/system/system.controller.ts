import {Controller, Post, Headers} from "@nestjs/common"
import {SystemService} from "./system.service"
import {ApiTags, ApiOperation, ApiHeader} from "@nestjs/swagger"

@ApiTags("system")
@Controller("system")
export class SystemController {
	constructor(private readonly systemService: SystemService) {}

	@Post("nuke")
	@ApiOperation({summary: "Reset entire system (Danger: Removes all data except admins)"})
	@ApiHeader({
		name: "X-System-Reset-Key",
		description: "Special key required for system reset",
		required: true,
	})
	async resetSystem(@Headers("x-system-reset-key") resetKey: string) {
		return this.systemService.resetSystem(resetKey)
	}
}
