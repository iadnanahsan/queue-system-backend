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

@WebSocketGateway({
	cors: {
		origin: "*",
	},
	namespace: "queue",
})
export class QueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server

	async handleConnection(client: Socket) {
		console.log(`Client connected: ${client.id}`)
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
	async emitQueueUpdate(departmentId: string, queueData: any) {
		this.server.to(`department-${departmentId}`).emit("queueUpdate", queueData)
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

	// Real-time updates for:
	// - New tickets (when reception registers)
	// - Status changes (waiting → serving → completed)
	// - Counter assignments
	// - No-show marking
}
