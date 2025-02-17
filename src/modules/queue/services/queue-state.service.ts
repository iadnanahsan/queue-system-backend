import {Injectable, BadRequestException, NotFoundException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, DataSource} from "typeorm"
import {QueueEntry} from "../entities/queue-entry.entity"
import {QueueStatus} from "../enums/queue-status.enum"
import {RedisService} from "../../../services/redis.service"
import {ALLOWED_STATUS_TRANSITIONS} from "../constants/status-transitions"

@Injectable()
export class QueueStateService {
	constructor(
		@InjectRepository(QueueEntry)
		private queueRepo: Repository<QueueEntry>,
		private redisService: RedisService,
		private dataSource: DataSource
	) {}

	async syncCounterState(counterId: number, departmentId: string): Promise<void> {
		const queryRunner = this.dataSource.createQueryRunner()
		await queryRunner.connect()
		await queryRunner.startTransaction()

		try {
			// 1. First clear any stale states for this counter
			await this.clearStaleStates(counterId, departmentId)

			// 2. Get current serving queue for this department
			const currentServing = await queryRunner.manager.findOne(QueueEntry, {
				where: {
					departmentId,
					status: QueueStatus.SERVING,
				},
				relations: ["counter", "department"],
			})

			if (currentServing) {
				// 3. Update queue entry with new counter
				currentServing.counterId = counterId
				await queryRunner.manager.save(QueueEntry, currentServing)

				// 4. Set Redis state
				await this.setRedisState(counterId, currentServing, departmentId)
			}

			await queryRunner.commitTransaction()
		} catch (error) {
			await queryRunner.rollbackTransaction()
			console.error("Error syncing counter state:", error)
			throw new Error("Failed to sync counter state")
		} finally {
			await queryRunner.release()
		}
	}

	private async clearStaleStates(counterId: number, departmentId: string): Promise<void> {
		// 1. Clear any existing serving entries for this counter
		await this.queueRepo.update(
			{
				counterId,
				departmentId,
				status: QueueStatus.SERVING,
			},
			{
				counterId: null,
			}
		)

		// 2. Clear Redis state
		const redisKey = `counter:${counterId}:current`
		await this.redisService.getClient().del(redisKey)
	}

	private async setRedisState(counterId: number, queue: QueueEntry, departmentId: string): Promise<void> {
		const redisKey = `counter:${counterId}:current`
		const redisValue = {
			queueId: queue.id,
			queueNumber: queue.queueNumber,
			patientName: queue.patientName,
			status: QueueStatus.SERVING,
			timestamp: new Date().toISOString(),
			departmentId,
			counterId,
		}

		// Use multi to ensure atomic Redis updates
		const multi = this.redisService.getClient().multi()

		// Clear any existing keys for this queue
		const staleKeys = await this.redisService.getClient().keys(`counter:*:current`)
		for (const key of staleKeys) {
			const staleState = await this.redisService.getClient().get(key)
			if (staleState) {
				const parsed = JSON.parse(staleState)
				if (parsed.queueId === queue.id) {
					multi.del(key)
				}
			}
		}

		// Set new state
		multi.set(redisKey, JSON.stringify(redisValue))
		await multi.exec()
	}

	async clearCounterState(counterId: number): Promise<void> {
		try {
			// 1. Get current queue entry for this counter
			const currentQueue = await this.queueRepo.findOne({
				where: {
					counterId,
					status: QueueStatus.SERVING,
				},
				relations: ["counter", "department"],
			})

			if (currentQueue) {
				// 2. Use save instead of update
				currentQueue.counterId = null
				await this.queueRepo.save(currentQueue)
			}

			// 3. Clear Redis state
			await this.redisService.getClient().del(`counter:${counterId}:current`)
		} catch (error) {
			console.error("Error clearing counter state:", error)
			throw new Error("Failed to clear counter state")
		}
	}

	async validateCounterChange(counterId: number, newCounterId: number): Promise<boolean> {
		// Get current serving queue for counter
		const currentServing = await this.queueRepo.findOne({
			where: {
				counterId: counterId,
				status: QueueStatus.SERVING,
			},
		})

		if (currentServing) {
			// Instead of blocking, track the state change
			await this.trackCounterChange(currentServing.id, counterId, newCounterId)
			// Log the counter change
			console.log(
				`Counter change tracked: Queue ${currentServing.id} from Counter ${counterId} to ${newCounterId}`
			)
		}

		return true
	}

	private async trackCounterChange(queueId: string, oldCounterId: number, newCounterId: number): Promise<void> {
		const redisKey = `queue:${queueId}:counter_history`
		const changeRecord = {
			timestamp: new Date().toISOString(),
			oldCounterId,
			newCounterId,
			status: QueueStatus.SERVING,
		}

		await this.redisService.getClient().rpush(redisKey, JSON.stringify(changeRecord))
	}

	async validateStatusTransition(
		queueId: string,
		fromStatus: QueueStatus,
		toStatus: QueueStatus,
		counterId?: number
	): Promise<boolean> {
		const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[fromStatus]

		if (!allowedTransitions?.includes(toStatus)) {
			throw new BadRequestException(`Invalid status transition from ${fromStatus} to ${toStatus}`)
		}

		// If this is a completion/no-show action, verify counter ownership
		if (toStatus === QueueStatus.COMPLETED || toStatus === QueueStatus.NO_SHOW) {
			const entry = await this.queueRepo.findOne({
				where: {id: queueId},
			})

			if (entry && entry.counterId !== counterId) {
				throw new BadRequestException("Only the counter that started serving can complete or mark no-show")
			}
		}

		return true
	}

	async getQueueHistory(queueId: string): Promise<any[]> {
		const redisKey = `queue:${queueId}:counter_history`
		const history = await this.redisService.getClient().lrange(redisKey, 0, -1)
		return history.map((record) => JSON.parse(record))
	}
}
