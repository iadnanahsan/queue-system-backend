import {Injectable, OnModuleDestroy} from "@nestjs/common"
import Redis from "ioredis"
import {ConfigService} from "@nestjs/config"

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly redis: Redis
	private readonly keyPrefix = "queue:"

	constructor(private configService: ConfigService) {
		this.redis = new Redis({
			host: this.configService.get("REDIS_HOST"),
			port: this.configService.get("REDIS_PORT"),
			password: this.configService.get("REDIS_PASSWORD"),
			keyPrefix: this.keyPrefix,
		})
	}

	getClient(): Redis {
		return this.redis
	}

	getDepartmentQueueKey(departmentId: string): string {
		return `dept:${departmentId}:queue`
	}

	getLockKey(key: string): string {
		return `lock:${key}`
	}

	async cleanup(pattern: string): Promise<void> {
		const keys = await this.redis.keys(pattern)
		if (keys.length) {
			await this.redis.del(...keys)
		}
	}

	async onModuleDestroy() {
		await this.redis.quit()
	}
}
