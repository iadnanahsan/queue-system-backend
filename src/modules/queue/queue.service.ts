import {Injectable, NotFoundException, BadRequestException, InternalServerErrorException} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, FindOptionsWhere, In, IsNull, EntityManager} from "typeorm"
import {QueueEntry} from "./entities/queue-entry.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {RegisterPatientDto} from "./dto/register-patient.dto"
import {QueueStatus} from "./enums/queue-status.enum"
import {QueueNumberService} from "./services/queue-number.service"
import {MoreThanOrEqual} from "typeorm"
import {CreateQueueDto} from "./dto/create-queue.dto"
import {QueueGateway} from "./queue.gateway"
import {CreateQueueEntryDto} from "./dto/create-queue-entry.dto"
import {RedisService} from "../../services/redis.service"
import {Cron} from "@nestjs/schedule"
import {DisplayGateway} from "../display/display.gateway"
import {ALLOWED_STATUS_TRANSITIONS, STATUS_ACTIONS} from "./constants/status-transitions"
import {GetQueueMetricsDto} from "./dto/get-queue-metrics.dto"
import {User} from "../../entities/user.entity"
import {RedisQueueMetrics} from "./dto/queue-metrics.dto"
import {DisplayService} from "../display/display.service"

@Injectable()
export class QueueService {
	private readonly LOCK_TTL = 5 // 5 seconds TTL for lock
	private readonly QUEUE_KEY_PREFIX = "dept:" // Using existing prefix pattern

	constructor(
		@InjectRepository(QueueEntry)
		private queueRepository: Repository<QueueEntry>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>,
		private queueNumberService: QueueNumberService,
		private queueGateway: QueueGateway,
		private readonly redisService: RedisService,
		private readonly displayGateway: DisplayGateway,
		@InjectRepository(User)
		private userRepository: Repository<User>,
		private displayService: DisplayService
	) {}

	private async generateQueueNumber(departmentId: string): Promise<string> {
		const department = await this.departmentRepository.findOne({
			where: {id: departmentId},
		})

		if (!department) {
			throw new NotFoundException("Department not found")
		}

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		// Get the last queue number for today
		const lastQueue = await this.queueRepository.findOne({
			where: {
				departmentId,
				createdAt: MoreThanOrEqual(today),
			},
			order: {
				createdAt: "DESC",
			},
		})

		// Format: P001, P002, etc. (P for Pharmacy, X for X-Ray, etc.)
		const number = lastQueue ? parseInt(lastQueue.queueNumber.substring(1)) + 1 : 1

		return `${department.prefix}${number.toString().padStart(3, "0")}`
	}

	async register(registerDto: RegisterPatientDto): Promise<QueueEntry> {
		const department = await this.departmentRepository.findOne({
			where: {id: registerDto.departmentId},
		})

		if (!department) {
			throw new NotFoundException(`Department not found`)
		}

		const queueNumber = await this.generateQueueNumber(registerDto.departmentId)

		const queueEntry = this.queueRepository.create({
			departmentId: registerDto.departmentId,
			queueNumber,
			fileNumber: registerDto.fileNumber,
			patientName: registerDto.patientName,
			status: QueueStatus.WAITING,
		})

		return this.queueRepository.save(queueEntry)
	}

	async updateStatus(id: string, status: QueueStatus): Promise<QueueEntry> {
		const entry = await this.queueRepository.findOne({
			where: {id},
			relations: ["department", "counter"],
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		// Update status and handle counter
		const updated = await this.queueRepository.save({
			...entry,
			status,
			counterId: status === QueueStatus.COMPLETED ? null : entry.counterId,
		})

		// Add this single line to invalidate display cache
		await this.displayService.invalidateDisplayCache(entry.departmentId)

		// Emit to both gateways
		await Promise.all([
			this.queueGateway.emitStatusUpdate(entry.departmentId, updated),
			this.displayGateway.emitDisplayUpdate(entry.departmentId, {
				queueNumber: updated.queueNumber,
				patientName: updated.patientName,
				counter: updated.counter?.number,
				status: updated.status,
			}),
		])

		return updated
	}

	async getCurrentQueue(departmentId: string): Promise<QueueEntry[]> {
		return this.queueRepository.find({
			where: {
				departmentId,
				status: QueueStatus.WAITING,
			},
			order: {
				createdAt: "ASC",
			},
		})
	}

	async getCounterQueue(counterId: number): Promise<QueueEntry[]> {
		return this.queueRepository.find({
			where: {
				counterId,
				status: QueueStatus.SERVING,
			},
			order: {
				createdAt: "ASC",
			},
		})
	}

	async getDepartmentStats(departmentId: string) {
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const entries = await this.queueRepository.find({
			where: {
				departmentId,
				createdAt: MoreThanOrEqual(today),
			},
		})

		return {
			total: entries.length,
			waiting: entries.filter((q) => q.status === "waiting").length,
			serving: entries.filter((q) => q.status === "serving").length,
			completed: entries.filter((q) => q.status === "completed").length,
			noShow: entries.filter((q) => q.status === "no_show").length,
			averageWaitTime: this.calculateAverageWaitTime(entries),
		}
	}

	private calculateAverageWaitTime(entries: QueueEntry[]): number {
		const completedEntries = entries.filter((e) => e.status === "completed" && e.servedAt && e.createdAt)

		if (!completedEntries.length) return 0

		const totalWaitTime = completedEntries.reduce((acc, entry) => {
			const waitTime = entry.servedAt!.getTime() - entry.createdAt.getTime()
			return acc + waitTime
		}, 0)

		return Math.floor(totalWaitTime / completedEntries.length / 60000) // Convert to minutes
	}

	async createEntry(data: CreateQueueDto): Promise<QueueEntry> {
		const queueEntry = this.queueRepository.create({
			queueNumber: data.queueNumber,
			fileNumber: data.fileNumber,
			patientName: data.patientName,
			departmentId: data.departmentId,
			status: QueueStatus.WAITING,
		})

		return this.queueRepository.save(queueEntry)
	}

	private async acquireLock(key: string): Promise<boolean> {
		const redis = this.redisService.getClient()
		const lockKey = this.redisService.getLockKey(key)
		return redis.set(lockKey, "1", "EX", this.LOCK_TTL, "NX").then((result) => result === "OK")
	}

	private async releaseLock(key: string): Promise<void> {
		const redis = this.redisService.getClient()
		const lockKey = this.redisService.getLockKey(key)
		await redis.del(lockKey)
	}

	// 1. Queue key helper - using existing pattern from RedisService
	private getQueueKey(departmentId: string): string {
		return this.redisService.getDepartmentQueueKey(departmentId)
	}

	// 2. Add error handling to Redis queue add
	private async addToRedisQueue(departmentId: string, queueEntry: QueueEntry) {
		try {
			const key = this.getQueueKey(departmentId)
			const score = new Date(queueEntry.createdAt).getTime()
			await this.redisService.zadd(key, score, queueEntry.id)
		} catch (error) {
			console.error("Redis add queue error:", error)
			// Don't throw - allow operation to continue even if Redis fails
		}
	}

	// 3. Add Redis remove function
	private async removeFromRedisQueue(departmentId: string, queueId: string) {
		try {
			const key = this.getQueueKey(departmentId)
			await this.redisService.zrem(key, queueId)
		} catch (error) {
			console.error("Redis remove error:", error)
			// Don't throw - allow operation to continue
		}
	}

	async registerPatient(createQueueEntryDto: CreateQueueEntryDto): Promise<QueueEntry> {
		const lockKey = `register:${createQueueEntryDto.department_id}:${createQueueEntryDto.file_number}`

		try {
			// First check if department exists
			const department = await this.departmentRepository.findOne({
				where: {id: createQueueEntryDto.department_id},
			})

			if (!department) {
				throw new NotFoundException(`Department with ID ${createQueueEntryDto.department_id} does not exist`)
			}

			const locked = await this.acquireLock(lockKey)
			if (!locked) {
				throw new BadRequestException("Registration in progress. Please try again.")
			}

			const today = new Date()
			today.setHours(0, 0, 0, 0)

			// Use transaction for database check and save
			const existingEntry = await this.queueRepository.findOne({
				where: {
					departmentId: createQueueEntryDto.department_id,
					fileNumber: createQueueEntryDto.file_number,
					createdAt: MoreThanOrEqual(today),
				},
			})

			if (existingEntry) {
				throw new BadRequestException("Patient already registered today")
			}

			const redis = this.redisService.getClient()
			const queueKey = this.redisService.getDepartmentQueueKey(createQueueEntryDto.department_id)

			// Use pipeline for Redis operations
			const pipeline = redis.pipeline()
			const queueNumber = await this.generateQueueNumber(createQueueEntryDto.department_id)

			const queueEntry = this.queueRepository.create({
				departmentId: createQueueEntryDto.department_id,
				queueNumber,
				fileNumber: createQueueEntryDto.file_number,
				patientName: createQueueEntryDto.patient_name,
				status: QueueStatus.WAITING,
			})

			const savedEntry = await this.queueRepository.save(queueEntry)

			pipeline.zadd(queueKey, Date.now(), savedEntry.id)
			await pipeline.exec()

			// Add cache invalidation after successful save
			await this.displayService.invalidateDisplayCache(createQueueEntryDto.department_id)

			// Existing socket emissions
			await this.queueGateway.emitNewTicket(createQueueEntryDto.department_id, savedEntry)

			// Add to Redis after successful DB save
			await this.addToRedisQueue(createQueueEntryDto.department_id, savedEntry)

			return savedEntry
		} catch (error) {
			console.error("Error registering patient:", error)
			if (error instanceof BadRequestException || error instanceof NotFoundException) {
				throw error // Propagate these specific errors
			}
			throw new InternalServerErrorException("Could not register patient")
		} finally {
			await this.releaseLock(lockKey)
		}
	}

	@Cron("0 0 * * *")
	async handleDailyCleanup() {
		const startTime = Date.now()
		const redis = this.redisService.getClient()
		let totalRemoved = 0

		try {
			const departments = await this.departmentRepository.find()

			for (const dept of departments) {
				const queueKey = `dept:${dept.id}:queue`
				const beforeCount = await redis.zcard(queueKey)

				// Remove entries older than 24 hours
				const cutoff = Date.now() - 24 * 60 * 60 * 1000
				await redis.zremrangebyscore(queueKey, 0, cutoff)

				const afterCount = await redis.zcard(queueKey)
				totalRemoved += beforeCount - afterCount
			}

			// Store cleanup metrics
			await redis.set(
				"queue:cleanup:last",
				JSON.stringify({
					lastCleanup: new Date(),
					keysRemoved: totalRemoved,
				})
			)
		} catch (error) {
			console.error("Daily cleanup failed:", error)
			throw error
		}
	}

	async getDepartmentQueue(departmentId: string): Promise<QueueEntry[]> {
		// First verify department exists
		const department = await this.departmentRepository.findOne({
			where: {id: departmentId},
			relations: ["counters"],
		})

		if (!department) {
			throw new NotFoundException(`Department with ID ${departmentId} does not exist`)
		}

		const redis = this.redisService.getClient()
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		// Remove old entries first
		await redis.zremrangebyscore(`dept:${departmentId}:queue`, 0, today.getTime())

		const entryIds = await redis.zrange(`dept:${departmentId}:queue`, 0, -1)

		if (!entryIds.length) {
			return []
		}

		const entries = await this.queueRepository.find({
			where: {
				id: In(entryIds),
			},
			relations: ["department", "counter"],
			order: {
				createdAt: "ASC",
			},
		})

		// Add department and counter names to each entry
		return entries.map((entry) => ({
			...entry,
			departmentName: entry.department?.name_en,
			counterNo: entry.counter?.number,
		}))
	}

	private async callNextPatient(departmentId: string, counterId: number): Promise<QueueEntry> {
		const nextPatient = await this.queueRepository.findOne({
			where: {
				departmentId,
				status: QueueStatus.WAITING,
				counterId: IsNull(),
			},
			order: {
				createdAt: "ASC",
			},
			relations: ["department"],
		})

		if (!nextPatient) {
			throw new NotFoundException("No waiting patients in queue")
		}

		return this.servePatient(nextPatient.id, counterId)
	}

	async callNumber(id: string): Promise<any> {
		const entry = await this.queueRepository.findOne({
			where: {id},
			relations: ["department", "counter"],
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		if (!entry.counter) {
			throw new BadRequestException("No counter assigned to this queue entry")
		}

		const isRecall = entry.status === QueueStatus.SERVING

		// Only update status if not already serving
		if (entry.status === QueueStatus.WAITING) {
			entry.status = QueueStatus.SERVING
			entry.servedAt = new Date()
			await this.queueRepository.save(entry)
		}

		// This is where the announcement should happen
		await this.displayGateway.emitAnnouncement(entry.departmentId, {
			queueNumber: entry.queueNumber,
			counter: entry.counter.number,
			patientName: entry.patientName,
			fileNumber: entry.fileNumber,
		})

		return {
			success: true,
			message: isRecall ? "Patient recalled" : "Patient called",
			queueNumber: entry.queueNumber,
			patientName: entry.patientName,
			counter: entry.counter.number,
			isRecall,
			status: entry.status,
		}
	}

	private validateStatusTransition(from: QueueStatus, to: QueueStatus) {
		const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[from]
		if (!allowedTransitions.includes(to)) {
			throw new BadRequestException(`Invalid status transition from ${from} to ${to}`)
		}
	}

	async servePatient(id: string, counterId: number): Promise<QueueEntry> {
		const entry = await this.queueRepository.findOne({
			where: {id},
			relations: ["department", "counter"],
		})

		const served = await this.queueRepository.save({
			...entry,
			status: QueueStatus.SERVING,
			counterId,
			servedAt: new Date(),
		})

		// Add cache invalidation BEFORE socket update
		await this.displayService.invalidateDisplayCache(entry.departmentId)

		await this.displayGateway.emitDisplayUpdate(entry.departmentId, {
			type: "STATUS_UPDATE",
			queueNumber: served.queueNumber,
			patientName: served.patientName,
			fileNumber: served.fileNumber,
			status: QueueStatus.SERVING,
			counter: counterId,
		})

		return served
	}

	async markNoShow(id: string): Promise<QueueEntry> {
		const entry = await this.queueRepository.findOne({
			where: {id},
			relations: ["department"],
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		if (![QueueStatus.WAITING, QueueStatus.SERVING].includes(entry.status)) {
			throw new BadRequestException("Can only mark waiting or serving patients as no-show")
		}

		entry.status = QueueStatus.NO_SHOW
		entry.noShowAt = new Date()

		const updated = await this.queueRepository.save(entry)

		// Add Redis cleanup
		await this.removeFromRedisQueue(entry.departmentId, entry.id)

		await this.queueGateway.emitStatusUpdate(entry.departmentId, updated)

		return updated
	}

	async completeAndCallNext(departmentId: string, counterId: number) {
		// 1. Find & complete current patient
		const currentPatient = await this.queueRepository.findOne({
			where: {
				departmentId,
				counterId,
				status: QueueStatus.SERVING,
			},
			relations: ["department", "counter"],
		})

		if (currentPatient) {
			// Complete current patient
			await this.queueRepository.save({
				...currentPatient,
				status: QueueStatus.COMPLETED,
				completedAt: new Date(),
			})

			// Add cache invalidation
			await this.displayService.invalidateDisplayCache(departmentId)

			// Existing Redis and socket updates
			await this.removeFromRedisQueue(departmentId, currentPatient.id)
			await this.displayGateway.emitDisplayUpdate(departmentId, {
				type: "STATUS_UPDATE",
				queueNumber: currentPatient.queueNumber,
				patientName: currentPatient.patientName,
				status: QueueStatus.COMPLETED,
			})
		}

		// 2. Try to get & serve next patient
		try {
			const nextPatient = await this.queueRepository.findOne({
				where: {
					departmentId,
					status: QueueStatus.WAITING,
					counterId: IsNull(),
				},
				order: {
					createdAt: "ASC",
				},
				relations: ["department", "counter"],
			})

			if (!nextPatient) {
				// Clear display when no next patient
				await this.displayGateway.emitDisplayUpdate(departmentId, {
					type: "CLEAR_SERVING",
					message: "No patients waiting",
				})
				return {completed: currentPatient, next: null}
			}

			const served = await this.servePatient(nextPatient.id, counterId)
			await this.queueGateway.emitNextPatient(departmentId, currentPatient, served)

			return {completed: currentPatient, next: served}
		} catch (error) {
			// Even if getting next patient fails, current patient completion succeeded
			console.error("Error getting next patient:", error)
			return {completed: currentPatient, next: null}
		}
	}

	async getCounterQueueDetails(counterId: number, departmentId: string) {
		// First get the counter and validate it belongs to the right department
		const counter = await this.counterRepository.findOne({
			where: {
				id: counterId,
				department_id: departmentId, // Add this condition
			},
			relations: ["department"],
		})

		if (!counter) {
			throw new NotFoundException("Counter not found or does not belong to this department")
		}

		// Get currently serving patient at THIS counter only
		const current = await this.queueRepository.findOne({
			where: {
				counterId,
				departmentId, // Add department check
				status: QueueStatus.SERVING,
			},
			relations: ["department"],
		})

		// Get waiting patients only from THIS department
		const queue = await this.queueRepository.find({
			where: {
				departmentId, // This was correct but now more explicit
				status: QueueStatus.WAITING,
				counterId: IsNull(),
			},
			order: {
				createdAt: "ASC",
			},
			relations: ["department"],
		})

		return {
			current: current
				? {
						...current,
						department: current.department,
						counter: current.counterId ? counter : null,
				  }
				: null,
			queue: queue.map((entry) => ({
				...entry,
				department: entry.department,
				counter: entry.counterId ? counter : null,
			})),
			counter,
		}
	}

	// Add validation to ensure proper counter assignment
	private validateCounterAssignment(entry: QueueEntry) {
		// Only SERVING status requires counter assignment
		if (entry.status === QueueStatus.SERVING && !entry.counterId) {
			throw new BadRequestException(`Status ${entry.status} requires counter assignment`)
		}
	}

	async completePatient(id: string): Promise<QueueEntry> {
		const entry = await this.queueRepository.findOne({
			where: {id},
			relations: ["department", "counter"],
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		// Validate counter assignment and status
		this.validateCounterAssignment(entry)
		if (entry.status !== QueueStatus.SERVING) {
			throw new BadRequestException("Can only complete patients that are being served")
		}

		entry.status = QueueStatus.COMPLETED
		entry.completedAt = new Date()

		const updated = await this.queueRepository.save(entry)

		// Add Redis cleanup
		await this.removeFromRedisQueue(entry.departmentId, entry.id)

		await this.queueGateway.emitStatusUpdate(entry.departmentId, updated)

		return updated
	}

	async getStaffMetrics(dto: GetQueueMetricsDto) {
		const startDate = new Date(dto.startDate)
		const endDate = new Date(dto.endDate)
		endDate.setHours(23, 59, 59)

		const counters = await this.counterRepository
			.createQueryBuilder("counter")
			.leftJoinAndSelect("counter.department", "department")
			.leftJoin("users", "user", "user.counter_id = counter.id AND user.role = :role", {
				role: "counter_staff",
			})
			.select([
				"counter.id as counter_id",
				"counter.number as counter_number",
				"department.name_en as department_name",
				"counter.department_id",
				"user.username as staff_name",
			])
			.getRawMany()

		const counterMetrics = {}
		for (const counter of counters) {
			const entries = await this.queueRepository
				.createQueryBuilder("queue")
				.where("queue.counter_id = :counterId", {counterId: counter.counter_id})
				.andWhere("queue.createdAt BETWEEN :startDate AND :endDate", {
					startDate,
					endDate,
				})
				.getMany()

			counterMetrics[counter.counter_id] = {
				counterId: counter.counter_id,
				counterNumber: counter.counter_number,
				departmentName: counter.department_name,
				departmentId: counter.department_id,
				staffName: counter.staff_name,
				totalServed: entries.filter((e) => e.status === QueueStatus.COMPLETED).length,
				noShows: entries.filter((e) => e.status === QueueStatus.NO_SHOW).length,
				averageServiceTime: this.calculateAverageServiceTime(entries),
			}
		}

		return Object.values(counterMetrics)
	}

	private calculateAverageServiceTime(entries: QueueEntry[]): number {
		const completedEntries = entries.filter(
			(e) => e.status === QueueStatus.COMPLETED && e.servedAt && e.completedAt
		)

		if (!completedEntries.length) return 0

		const totalTime = completedEntries.reduce((acc, entry) => {
			return acc + (entry.completedAt!.getTime() - entry.servedAt!.getTime())
		}, 0)

		return Math.round(totalTime / completedEntries.length / 1000 / 60) // in minutes
	}

	async getDepartmentMetrics(dto: GetQueueMetricsDto) {
		const startDate = new Date(dto.startDate)
		const endDate = new Date(dto.endDate)
		endDate.setHours(23, 59, 59)

		const query = this.queueRepository
			.createQueryBuilder("queue")
			.leftJoin("queue.department", "department")
			.where("queue.createdAt BETWEEN :startDate AND :endDate", {
				startDate,
				endDate,
			})

		if (dto.departmentId) {
			query.andWhere("queue.departmentId = :departmentId", {
				departmentId: dto.departmentId,
			})
		}

		const entries = await query
			.select([
				"department.id",
				"department.name_en",
				"queue.status",
				"queue.createdAt",
				"queue.servedAt",
				"queue.completedAt",
			])
			.getMany()

		// Group by department
		const departmentMetrics = {}
		entries.forEach((entry) => {
			if (!entry.department) return

			const deptId = entry.department.id
			if (!departmentMetrics[deptId]) {
				departmentMetrics[deptId] = {
					departmentName: entry.department.name_en,
					totalPatients: 0,
					waiting: 0,
					serving: 0,
					completed: 0,
					noShows: 0,
					averageWaitTime: 0,
					totalWaitTime: 0,
				}
			}

			const metrics = departmentMetrics[deptId]
			metrics.totalPatients++

			switch (entry.status) {
				case QueueStatus.WAITING:
					metrics.waiting++
					break
				case QueueStatus.SERVING:
					metrics.serving++
					break
				case QueueStatus.COMPLETED:
					metrics.completed++
					if (entry.createdAt && entry.servedAt) {
						const waitTime = entry.servedAt.getTime() - entry.createdAt.getTime()
						metrics.totalWaitTime += waitTime
					}
					break
				case QueueStatus.NO_SHOW:
					metrics.noShows++
					break
			}
		})

		// Calculate averages
		Object.values(departmentMetrics).forEach((metric: any) => {
			if (metric.completed > 0) {
				metric.averageWaitTime = Math.round(metric.totalWaitTime / metric.completed / 1000 / 60) // in minutes
			}
			delete metric.totalWaitTime
		})

		return Object.values(departmentMetrics)
	}

	async assignNextPatient(departmentId: string, counterId: number): Promise<QueueEntry> {
		return await this.queueRepository.manager.transaction(async (manager) => {
			// Find next patient with pessimistic lock
			const nextPatient = await manager.findOne(QueueEntry, {
				where: {
					departmentId,
					status: QueueStatus.WAITING,
					counterId: null, // Not assigned to any counter
				},
				order: {
					createdAt: "ASC", // FIFO order
				},
				lock: {mode: "pessimistic_write"}, // Prevent concurrent access
			})

			if (!nextPatient) {
				throw new NotFoundException("No waiting patients in queue")
			}

			// Update the queue entry
			const updatedEntry = await manager.save(QueueEntry, {
				...nextPatient,
				counterId,
				status: QueueStatus.SERVING,
				servedAt: new Date(),
			})

			return updatedEntry
		})
	}

	async getRedisMetrics(): Promise<RedisQueueMetrics> {
		const redis = this.redisService.getClient()

		// Get all queue keys
		const queuePattern = "dept:*:queue"
		const queueKeys = await redis.keys(queuePattern)

		// Get all display verify keys
		const displayPattern = "display:verify:*"
		const displayKeys = await redis.keys(displayPattern)

		return {
			queueKeys: queueKeys.length,
			displayVerifyKeys: displayKeys.length,
		}
	}

	async noShowAndCallNext(departmentId: string, counterId: number) {
		// 1. Find & mark current patient as no-show
		const currentPatient = await this.queueRepository.findOne({
			where: {
				departmentId,
				counterId,
				status: QueueStatus.SERVING,
			},
			relations: ["department", "counter"],
		})

		if (currentPatient) {
			// Mark as no-show
			await this.queueRepository.save({
				...currentPatient,
				status: QueueStatus.NO_SHOW,
				noShowAt: new Date(),
			})

			// Add cache invalidation
			await this.displayService.invalidateDisplayCache(departmentId)

			// Existing Redis and socket updates
			await this.removeFromRedisQueue(departmentId, currentPatient.id)
			await this.displayGateway.emitDisplayUpdate(departmentId, {
				type: "STATUS_UPDATE",
				queueNumber: currentPatient.queueNumber,
				patientName: currentPatient.patientName,
				status: QueueStatus.NO_SHOW,
			})
		}

		// 2. Try to get & serve next patient
		try {
			const nextPatient = await this.queueRepository.findOne({
				where: {
					departmentId,
					status: QueueStatus.WAITING,
					counterId: IsNull(),
				},
				order: {
					createdAt: "ASC",
				},
				relations: ["department", "counter"],
			})

			if (!nextPatient) {
				// Clear display when no next patient
				await this.displayGateway.emitDisplayUpdate(departmentId, {
					type: "CLEAR_SERVING",
					message: "No patients waiting",
				})
				return {noShow: currentPatient, next: null}
			}

			const served = await this.servePatient(nextPatient.id, counterId)
			await this.queueGateway.emitNextPatient(departmentId, currentPatient, served)

			return {noShow: currentPatient, next: served}
		} catch (error) {
			// Even if getting next patient fails, no-show marking succeeded
			console.error("Error getting next patient:", error)
			return {noShow: currentPatient, next: null}
		}
	}

	// Check Redis health
	private async checkRedisHealth(): Promise<boolean> {
		try {
			const client = this.redisService.getClient()
			await client.ping()
			return true
		} catch (error) {
			console.error("Redis health check failed:", error)
			return false
		}
	}

	async updateEntryStatus(entryId: string, status: string, counterId?: number): Promise<QueueEntry> {
		console.log("Updating entry status:", {entryId, status, counterId})

		// Get entry with counter relation
		const entry = await this.queueRepository.findOne({
			where: {id: entryId},
			relations: ["counter"], // Make sure counter is loaded
		})

		console.log("Found entry:", entry)

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		// Update status and counter
		entry.status = status as QueueStatus
		if (status === "serving" && counterId) {
			console.log("Setting counter:", counterId)
			entry.counterId = counterId

			// Load and verify counter
			const counter = await this.counterRepository.findOne({
				where: {id: counterId},
			})
			console.log("Found counter:", counter)

			entry.counter = counter

			// Trigger announcement when status changes to serving
			await this.queueGateway.emitAnnouncement(entry.departmentId, {
				queueNumber: entry.queueNumber,
				counter: counter.number,
				patientName: entry.patientName,
				fileNumber: entry.fileNumber,
			})
		}

		// Save and verify
		const saved = await this.queueRepository.save(entry)
		console.log("Saved entry:", saved)

		// Reload to verify relations
		const reloaded = await this.queueRepository.findOne({
			where: {id: entryId},
			relations: ["counter"],
		})
		console.log("Reloaded entry:", reloaded)

		return reloaded
	}
}
