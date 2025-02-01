import {Injectable, NotFoundException, BadRequestException, InternalServerErrorException, Inject} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository, FindOptionsWhere, In, IsNull, EntityManager} from "typeorm"
import {QueueEntry} from "./entities/queue-entry.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {RegisterPatientDto} from "./dto/register-patient.dto"
import {QueueStatus} from "./enums/queue-status.enum"
import {QueueNumberService} from "./services/queue-number.service"
import {MoreThanOrEqual, MoreThan} from "typeorm"
import {CreateQueueDto} from "./dto/create-queue.dto"
import {QueueGateway} from "./queue.gateway"
import {CreateQueueEntryDto} from "./dto/create-queue-entry.dto"
import {RedisService} from "../../services/redis.service"
import {Cron} from "@nestjs/schedule"
import {DisplayGateway} from "../display/display.gateway"
import {ALLOWED_STATUS_TRANSITIONS, STATUS_ACTIONS} from "./constants/status-transitions"
import {GetQueueMetricsDto} from "./dto/get-queue-metrics.dto"
import {User} from "../../entities/user.entity"

@Injectable()
export class QueueService {
	private readonly LOCK_TTL = 5 // 5 seconds TTL for lock

	constructor(
		@InjectRepository(QueueEntry)
		private queueRepository: Repository<QueueEntry>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>,
		@InjectRepository(Counter)
		private counterRepository: Repository<Counter>,
		private queueNumberService: QueueNumberService,
		@Inject("QUEUE_GATEWAY")
		private queueGateway: QueueGateway,
		private readonly redisService: RedisService,
		private readonly displayGateway: DisplayGateway,
		@InjectRepository(User)
		private userRepository: Repository<User>
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
			relations: ["department"],
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		entry.status = status

		// Add timestamps based on status
		switch (status) {
			case QueueStatus.SERVING:
				entry.servedAt = new Date()
				break
			case QueueStatus.COMPLETED:
				entry.completedAt = new Date()
				break
			case QueueStatus.NO_SHOW:
				entry.noShowAt = new Date()
				break
		}

		const updated = await this.queueRepository.save(entry)

		// Use new sync event emission
		await this.queueGateway.emitQueueUpdate(
			entry.departmentId,
			updated,
			status === QueueStatus.COMPLETED ? "COMPLETE" : "UPDATE"
		)

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

			await this.queueGateway.emitNewTicket(createQueueEntryDto.department_id, savedEntry)

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
		const redis = this.redisService.getClient()
		const departments = await this.departmentRepository.find()
		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const pipeline = redis.pipeline()
		for (const dept of departments) {
			const queueKey = this.redisService.getDepartmentQueueKey(dept.id)
			pipeline.zremrangebyscore(queueKey, 0, today.getTime())
		}
		await pipeline.exec()
	}

	async getDepartmentQueue(departmentId: string): Promise<QueueEntry[]> {
		// First verify department exists
		const department = await this.departmentRepository.findOne({
			where: {id: departmentId},
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
			return [] // Return empty array if no entries
		}

		const where: FindOptionsWhere<QueueEntry> = {
			id: In(entryIds),
		}

		return this.queueRepository.find({
			where,
			order: {
				createdAt: "ASC",
			},
		})
	}

	async callNextPatient(departmentId: string, counterId: number): Promise<QueueEntry> {
		const redis = this.redisService.getClient()
		const nextEntryId = await redis.zrange(`dept:${departmentId}:queue`, 0, 0)

		if (!nextEntryId.length) {
			throw new NotFoundException("No patients in queue")
		}

		const entry = await this.queueRepository.findOne({
			where: {id: nextEntryId[0]},
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		entry.status = QueueStatus.SERVING
		entry.counterId = counterId
		const savedEntry = await this.queueRepository.save(entry)

		// Remove from Redis queue
		await redis.zrem(`dept:${departmentId}:queue`, entry.id)

		// Emit via WebSocket for queue updates
		await this.queueGateway.emitTicketCalled(departmentId, savedEntry)

		// Emit for display screen
		await this.displayGateway.emitDisplayUpdate(departmentId, {
			queueNumber: entry.queueNumber,
			patientName: entry.patientName,
			counter: counterId,
			status: "called",
		})

		// Emit announcement
		await this.displayGateway.emitAnnouncement(departmentId, {
			fileNumber: entry.fileNumber,
			name: entry.patientName,
			counter: counterId,
		})

		return savedEntry
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

		// Emit call event via WebSocket for audio
		await this.displayGateway.emitAnnouncement(entry.departmentId, {
			fileNumber: entry.fileNumber,
			name: entry.patientName,
			counter: entry.counter.number,
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
		// Validate counter exists
		const counter = await this.counterRepository.findOne({
			where: {id: counterId},
		})
		if (!counter) {
			throw new NotFoundException(`Counter ${counterId} not found`)
		}

		const entry = await this.queueRepository.findOne({
			where: {id},
		})
		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		// Must have counter when serving
		entry.counterId = counterId
		entry.status = QueueStatus.SERVING
		entry.servedAt = new Date()

		return this.queueRepository.save(entry)
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
		await this.queueGateway.emitStatusUpdate(entry.departmentId, updated)

		return updated
	}

	async completeAndCallNext(departmentId: string, counterId: number): Promise<QueueEntry> {
		// First complete current patient if any
		const currentPatient = await this.queueRepository.findOne({
			where: {
				departmentId,
				counterId,
				status: QueueStatus.SERVING,
			},
		})

		if (currentPatient) {
			currentPatient.status = QueueStatus.COMPLETED
			currentPatient.completedAt = new Date()
			await this.queueRepository.save(currentPatient)
			await this.queueGateway.emitStatusUpdate(departmentId, currentPatient)
		}

		// Then call next patient
		return this.callNextPatient(departmentId, counterId)
	}

	async getCounterQueueDetails(counterId: number, departmentId: string) {
		// Get currently serving patient at this counter
		const current = await this.queueRepository.findOne({
			where: {
				counterId,
				status: QueueStatus.SERVING,
			},
		})

		// Get waiting patients in staff's department
		const queue = await this.queueRepository.find({
			where: {
				departmentId,
				status: QueueStatus.WAITING,
				counterId: IsNull(), // Not assigned to any counter yet
			},
			order: {
				createdAt: "ASC",
			},
		})

		return {
			current,
			queue,
			counter: {
				id: counterId,
				departmentId,
			},
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
			relations: ["department"],
		})

		if (!entry) {
			throw new NotFoundException("Queue entry not found")
		}

		// Validate counter assignment and status
		await this.validateCounterAssignment(entry)
		if (entry.status !== QueueStatus.SERVING) {
			throw new BadRequestException("Can only complete patients that are being served")
		}

		entry.status = QueueStatus.COMPLETED
		entry.completedAt = new Date()

		const updated = await this.queueRepository.save(entry)
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

	async getEntriesAfterVersion(departmentId: string, lastVersion: number): Promise<QueueEntry[]> {
		return this.queueRepository.find({
			where: {
				departmentId,
				version: MoreThan(lastVersion),
			},
			order: {
				version: "ASC",
			},
		})
	}

	@Cron("*/5 * * * *") // Every 5 minutes
	async persistQueueStates() {
		const departments = await this.departmentRepository.find()

		for (const dept of departments) {
			const entries = await this.queueRepository.find({
				where: {
					departmentId: dept.id,
					status: In([QueueStatus.WAITING, QueueStatus.SERVING]),
				},
				order: {
					createdAt: "ASC",
				},
			})

			await this.redisService.saveQueueState(dept.id, entries)
		}
	}

	async recoverQueueState(departmentId: string): Promise<void> {
		const cachedState = await this.redisService.getQueueState(departmentId)
		if (!cachedState) return

		const currentEntries = await this.queueRepository.find({
			where: {departmentId},
			order: {version: "DESC"},
			take: 1,
		})

		const latestVersion = currentEntries[0]?.version || 0
		const cachedEntries = cachedState.entries.filter((e) => e.version > latestVersion)

		if (cachedEntries.length > 0) {
			await this.queueGateway.emitQueueUpdate(departmentId, cachedEntries[cachedEntries.length - 1], "UPDATE")
		}
	}
}
