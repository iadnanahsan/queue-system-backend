import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets"
import {Server, Socket} from "socket.io"
import {UseGuards} from "@nestjs/common"
import {WsJwtAuthGuard} from "../auth/guards/ws-jwt-auth.guard"
import {QueueEntry} from "./entities/queue-entry.entity"
import {QueueStatus} from "./enums/queue-status.enum"
import {DisplayGateway} from "../display/display.gateway"

interface QueueUpdate {
	type: "STATUS_UPDATE" | "NEW_ENTRY" | "COMPLETED"
	queueNumber: string
	patientName: string
	fileNumber: string
	status: QueueStatus
	counter?: number
}

@WebSocketGateway({
	cors: {
		origin: ["https://queue.mchd-manager.com", "http://localhost:5000"],
		credentials: true,
	},
	namespace: "queue",
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(private readonly displayGateway: DisplayGateway) {}

	@WebSocketServer()
	server: Server

	async handleConnection(client: Socket) {
		console.log(`Queue client connected: ${client.id}`)

		const token = client.handshake.auth.token
		if (!token) {
			client.disconnect()
			return
		}
	}

	async handleDisconnect(client: Socket) {
		console.log(`Queue client disconnected: ${client.id}`)
	}

	private debug(message: string, ...args: any[]) {
		console.log(`[QueueGateway] ${message}`, ...args)
	}

	private logRoomInfo(departmentId: string) {
		try {
			// Make sure server and adapter are initialized
			if (!this.server?.sockets?.adapter) {
				this.debug("Socket server not ready")
				return
			}

			const roomName = `department-${departmentId}`
			const room = this.server.sockets.adapter.rooms.get(roomName)
			this.debug(`Active clients in department ${departmentId}: ${room?.size || 0}`)
		} catch (error: any) {
			this.debug("Error checking room info:", error?.message)
		}
	}

	@UseGuards(WsJwtAuthGuard)
	@SubscribeMessage("joinDepartmentRoom")
	async handleJoinDepartmentRoom(client: Socket, departmentId: string) {
		try {
			const roomName = `department-${departmentId}`
			await client.join(roomName)

			// Only log room info if server is ready
			if (this.server?.sockets?.adapter) {
				this.logRoomInfo(departmentId)
			}

			this.debug(`Client ${client.id} joined department: ${departmentId}`)
		} catch (error: any) {
			this.debug(`Error joining department room: ${error?.message || "Unknown error"}`)
			client.emit("error", "Failed to join department room")
		}
	}

	// Restore original methods
	async emitQueueUpdate(departmentId: string, queueData: any) {
		this.server.to(`department-${departmentId}`).emit("queueUpdate", queueData)
	}

	async emitNewTicket(departmentId: string, entry: QueueEntry) {
		try {
			this.debug(`Attempting to emit new ticket for dept ${departmentId}`)

			// Emit to queue clients
			this.server.to(`department-${departmentId}`).emit("newTicket", entry)

			// Add type and fileNumber for display
			const displayUpdate = {
				type: "NEW_ENTRY", // Add type for new entries
				queueNumber: entry.queueNumber,
				patientName: entry.patientName,
				fileNumber: entry.fileNumber, // Include fileNumber
				status: entry.status,
			}

			// Emit to display
			this.displayGateway.emitDisplayUpdate(departmentId, displayUpdate)
		} catch (error: any) {
			this.debug(`Error emitting new ticket: ${error?.message}`)
		}
	}

	async emitTicketCalled(departmentId: string, ticket: any) {
		this.server.to(`department-${departmentId}`).emit("ticketCalled", ticket)
	}

	// Fix status update method
	async emitStatusUpdate(departmentId: string, entry: QueueEntry) {
		// Emit to queue clients
		this.server.to(`department-${departmentId}`).emit("queue:status", entry)

		// Single emit to display
		const update: QueueUpdate = {
			type: "STATUS_UPDATE",
			queueNumber: entry.queueNumber,
			patientName: entry.patientName,
			fileNumber: entry.fileNumber,
			status: entry.status,
			counter: entry.counter?.number,
		}

		await this.displayGateway.emitDisplayUpdate(departmentId, update)
	}

	// Emit when next patient is called
	async emitNextPatient(departmentId: string, completed: QueueEntry, next?: QueueEntry) {
		this.server.to(`department-${departmentId}`).emit("queue:next", {
			departmentId,
			completed,
			next,
		})
	}

	// When queue status changes
	// async handleQueueUpdate(departmentId: string, data: any) {
	//     await this.displayGateway.emitDisplayUpdate(departmentId, {...})
	// }

	// Real-time updates for:
	// - New tickets (when reception registers)
	// - Status changes (waiting → serving → completed)
	// - Counter assignments
	// - No-show marking

	async emitAnnouncement(
		departmentId: string,
		data: {
			queueNumber: string
			counter: number
			patientName: string
		}
	) {
		// Debug announcement data
		console.log("Emitting announcement:", data)

		// Emit to display gateway
		await this.displayGateway.emitDisplayUpdate(departmentId, {
			type: "ANNOUNCEMENT",
			...data,
		})
	}
}
