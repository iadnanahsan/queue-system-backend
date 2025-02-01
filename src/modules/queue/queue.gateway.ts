import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets"
import {Server, Socket} from "socket.io"
import {UseGuards, Injectable, Inject, forwardRef} from "@nestjs/common"
import {WsJwtAuthGuard} from "../auth/guards/ws-jwt-auth.guard"
import {QueueEntry} from "./entities/queue-entry.entity"
import {QueueStatus} from "./enums/queue-status.enum"
import {QueueSyncEvent, QueueSyncResponse} from "./interfaces/queue-sync.interface"
import {QueueService} from "./queue.service"

@Injectable()
@WebSocketGateway({
	cors: {
		origin: "*",
	},
	namespace: "queue",
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server

	constructor(
		@Inject(forwardRef(() => QueueService))
		private readonly queueService: QueueService
	) {}

	async handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`)
		// Recovery will be triggered by client when ready
	}

	async handleDisconnect(client: Socket) {
		console.log(`Client disconnected: ${client.id}`)
	}

	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage("joinDepartmentRoom")
	async handleJoinDepartmentRoom(client: Socket, departmentId: string) {
		await client.join(`department-${departmentId}`)
	}

	// Restore original methods
	async emitQueueUpdate(departmentId: string, entry: QueueEntry, type: "UPDATE" | "NEW" | "COMPLETE" = "UPDATE") {
		const syncEvent: QueueSyncEvent = {
			entry,
			timestamp: Date.now(),
			version: entry.version,
			type,
		}

		this.server.to(`department:${departmentId}`).emit("queue:sync", syncEvent)
	}

	async emitNewTicket(departmentId: string, ticket: any) {
		this.server.to(`department-${departmentId}`).emit("newTicket", ticket)
	}

	async emitTicketCalled(departmentId: string, ticket: any) {
		this.server.to(`department-${departmentId}`).emit("ticketCalled", ticket)
	}

	// Fix status update method
	async emitStatusUpdate(departmentId: string, entry: QueueEntry) {
		this.server.to(`department-${departmentId}`).emit("queue:status", {
			id: entry.id,
			queueNumber: entry.queueNumber,
			status: entry.status,
			counter: entry.counterId,
			updatedAt: new Date(),
		})
	}

	// Emit when next patient is called
	async emitNextPatient(departmentId: string, completed: QueueEntry, next?: QueueEntry) {
		this.server.to(`department-${departmentId}`).emit("queue:next", {
			departmentId,
			completed,
			next,
		})
	}

	@SubscribeMessage("queue:checkSync")
	async handleSyncCheck(client: Socket, data: {departmentId: string; lastVersion: number}) {
		const {departmentId, lastVersion} = data

		// Check if client needs sync
		const latestEntries = await this.queueService.getEntriesAfterVersion(departmentId, lastVersion)

		if (latestEntries.length > 0) {
			// Send missing updates
			latestEntries.forEach((entry) => {
				this.emitQueueUpdate(departmentId, entry)
			})
		}

		return {
			success: true,
			latestVersion: latestEntries[0]?.version || lastVersion,
		}
	}

	@SubscribeMessage("queue:recover")
	async handleRecovery(client: Socket, data: {departmentId: string}): Promise<QueueSyncResponse> {
		try {
			await this.queueService.recoverQueueState(data.departmentId)
			return {success: true}
		} catch (error) {
			return {
				success: false,
				message: "Recovery failed",
			}
		}
	}
}
