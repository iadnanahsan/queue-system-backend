import {Injectable, OnModuleDestroy} from "@nestjs/common"
import Redis from "ioredis"
import {ConfigService} from "@nestjs/config"

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly redis: Redis
	private readonly keyPrefix = "queue:"
	private client: Redis

	constructor(private configService: ConfigService) {
		this.redis = new Redis({
			host: this.configService.get("REDIS_HOST"),
			port: this.configService.get("REDIS_PORT"),
			password: this.configService.get("REDIS_PASSWORD"),
			keyPrefix: this.keyPrefix,
		})
		this.client = this.redis
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

	async zadd(key: string, score: number, member: string) {
		return this.client.zadd(key, score, member)
	}

	async zrem(key: string, ...members: string[]) {
		return this.client.zrem(key, ...members)
	}

	async zrange(key: string, start: number, stop: number) {
		return this.client.zrange(key, start, stop)
	}

	async del(key: string) {
		return this.client.del(key)
	}
}
