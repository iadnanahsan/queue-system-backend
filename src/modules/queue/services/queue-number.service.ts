import {Injectable} from "@nestjs/common"
import {InjectRepository} from "@nestjs/typeorm"
import {Repository} from "typeorm"
import {QueueEntry} from "../entities/queue-entry.entity"
import {Department} from "../../departments/entities/department.entity"
import {QueueNumber} from "../interfaces/queue-number.interface"

@Injectable()
export class QueueNumberService {
	constructor(
		@InjectRepository(QueueEntry)
		private queueRepository: Repository<QueueEntry>,
		@InjectRepository(Department)
		private departmentRepository: Repository<Department>
	) {}

	async generateQueueNumber(departmentId: string): Promise<QueueNumber> {
		const department = await this.departmentRepository.findOne({
			where: {id: departmentId},
		})

		if (!department) {
			throw new Error("Department not found")
		}

		const today = new Date()
		today.setHours(0, 0, 0, 0)

		const lastQueue = await this.queueRepository.findOne({
			where: {
				departmentId: departmentId,
				createdAt: today,
			},
			order: {
				createdAt: "DESC",
			},
		})

		const sequentialNumber = lastQueue ? parseInt(lastQueue.queueNumber.split("-")[1]) + 1 : 1

		const formattedNumber = String(sequentialNumber).padStart(3, "0")
		const queueNumber = `${department.prefix}-${formattedNumber}`

		return {
			prefix: department.prefix,
			number: sequentialNumber,
			formatted: queueNumber,
			timestamp: new Date(),
			departmentId: departmentId,
			priority: false,
		}
	}
}
