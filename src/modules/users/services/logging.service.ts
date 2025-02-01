import {Injectable, Logger} from "@nestjs/common"

@Injectable()
export class UserLoggingService {
	private readonly logger = new Logger(UserLoggingService.name)

	logDepartmentUpdate(userId: string, oldDeptId: string, newDeptId: string) {
		this.logger.log(`Updating department for user ${userId} from ${oldDeptId} to ${newDeptId}`)
	}

	logError(operation: string, error: any) {
		this.logger.error(`Error during ${operation}`, error.stack)
	}
}
