import {Injectable} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, MoreThanOrEqual} from "typeorm"
import {Department} from "../../../entities/department.entity"
import {Counter} from "../../../entities/counter.entity"
import {QueueEntry} from "../../../entities/queue-entry.entity"
import {User} from "../../../entities/user.entity"
import {AdminStatsResponseDto} from "../dto/stats-response.dto"
import {QueueStatus} from "../../queue/enums/queue-status.enum"
import {RedisService} from "../../../services/redis.service"

@Injectable()
export class AdminStatsService {
	private readonly STATS_CACHE_KEY = "admin:stats"
	private readonly CACHE_TTL = 300 // 5 minutes

	constructor(
		private readonly redisService: RedisService,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>,
		@InjectRepository(QueueEntry)
		private queueRepository: Repository<QueueEntry>,
		@InjectRepository(User)
		private userRepository: Repository<User>
	) {}

	async getStats(): Promise<AdminStatsResponseDto> {
		try {
			const redis = this.redisService.getClient()
			const cached = await redis.get(this.STATS_CACHE_KEY)

			if (cached) {
				return JSON.parse(cached)
			}

			const stats = await this.computeStats()
			await redis.set(this.STATS_CACHE_KEY, JSON.stringify(stats), "EX", this.CACHE_TTL)

			return stats
		} catch (error) {
			console.error("Error fetching admin stats:", error)
			// If Redis fails, return fresh stats
			return this.computeStats()
		}
	}

	async invalidateCache() {
		const redis = this.redisService.getClient()
		await redis.del(this.STATS_CACHE_KEY)
	}

	private async computeStats(): Promise<AdminStatsResponseDto> {
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const [departments, counters, users, queues] = await Promise.all([
			this.departmentRepository.count(),
			this.counterRepository.count(),
			this.userRepository.count(),
			this.getQueueStats(today),
		])

		return {
			departments,
			counters,
			queues,
			users,
		}
	}

	private async getQueueStats(today: Date) {
		const [total, todayCount, waiting, completed, noShows] = await Promise.all([
			this.queueRepository.count(),
			this.queueRepository.count({
				where: {
					created_at: MoreThanOrEqual(today),
				},
			}),
			this.queueRepository.count({where: {status: QueueStatus.WAITING}}),
			this.queueRepository.count({where: {status: QueueStatus.COMPLETED}}),
			this.queueRepository.count({where: {status: QueueStatus.NO_SHOW}}),
		])

		return {
			total,
			today: todayCount,
			waiting,
			completed,
			noShows,
		}
	}
}
