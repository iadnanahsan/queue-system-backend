import {Injectable, UnauthorizedException} from "@nestjs/common"
import {InjectEntityManager, InjectRepository} from "@nestjs/typeorm"
import {EntityManager, Repository} from "typeorm"
import {User} from "../../entities/user.entity"
import {ConfigService} from "@nestjs/config"
import {UserRole} from "../users/enums/user-role.enum"

@Injectable()
export class SystemService {
	constructor(
		@InjectEntityManager() private entityManager: EntityManager,
		@InjectRepository(User) private userRepository: Repository<User>,
		private configService: ConfigService
	) {}

	async resetSystem(resetKey: string): Promise<{success: boolean; message: string}> {
		const expectedKey = this.configService.get<string>("SYSTEM_RESET_KEY")
		if (!expectedKey || resetKey !== expectedKey) {
			throw new UnauthorizedException("Invalid reset key")
		}

		try {
			await this.entityManager.transaction(async (manager) => {
				console.log("Starting system reset...")

				// First backup admin users
				const adminUsers = await manager.getRepository(User).find({
					where: {role: UserRole.ADMIN},
				})
				console.log(`Found ${adminUsers.length} admin users to preserve`)

				// Get all tables
				const tables = await manager.query(
					`SELECT tablename FROM pg_tables 
					 WHERE schemaname = 'public' 
					 AND tablename NOT IN ('migrations', 'typeorm_metadata')`
				)

				// Disable constraints
				await manager.query("SET CONSTRAINTS ALL DEFERRED")

				// Truncate ALL tables including users
				for (const {tablename} of tables) {
					console.log(`Truncating table: ${tablename}`)
					await manager.query(`TRUNCATE TABLE "${tablename}" CASCADE`)
				}

				// Restore admin users
				if (adminUsers.length > 0) {
					await manager.getRepository(User).save(adminUsers)
					console.log(`Restored ${adminUsers.length} admin users`)
				}

				// Re-enable constraints
				await manager.query("SET CONSTRAINTS ALL IMMEDIATE")
				console.log("Reset completed successfully")
			})

			return {
				success: true,
				message: "System reset completed. Admin users restored.",
			}
		} catch (error) {
			console.error("System reset failed:", error)
			throw new Error(`Reset failed: ${error}`)
		}
	}
}
