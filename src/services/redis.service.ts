import {Injectable, OnModuleDestroy} from "@nestjs/common"
import Redis from "ioredis"
import {ConfigService} from "@nestjs/config"
import {QueueEntry} from "../modules/queue/entities/queue-entry.entity"

@Injectable()
export class RedisService implements OnModuleDestroy {
	private readonly redis: Redis
	private readonly keyPrefix = "queue:"
	private readonly QUEUE_STATE_PREFIX = "queue:state:"
	private readonly QUEUE_STATE_TTL = 24 * 60 * 60 // 24 hours

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

	private getQueueStateKey(departmentId: string): string {
		return `${this.QUEUE_STATE_PREFIX}${departmentId}`
	}

	async saveQueueState(departmentId: string, entries: QueueEntry[]): Promise<void> {
		const key = this.getQueueStateKey(departmentId)
		await this.redis.setex(
			key,
			this.QUEUE_STATE_TTL,
			JSON.stringify({
				timestamp: Date.now(),
				entries: entries,
			})
		)
	}

	async getQueueState(departmentId: string): Promise<{
		timestamp: number
		entries: QueueEntry[]
	} | null> {
		const key = this.getQueueStateKey(departmentId)
		const data = await this.redis.get(key)
		return data ? JSON.parse(data) : null
	}

	async onModuleDestroy() {
		await this.redis.quit()
	}
}
