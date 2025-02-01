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

@WebSocketGateway({
	cors: {
		origin: "*",
	},
	namespace: "display",
})
export class DisplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server

	async handleConnection(client: Socket) {
		console.log(`Display client connected: ${client.id}`)
	}

	async handleDisconnect(client: Socket) {
		console.log(`Display client disconnected: ${client.id}`)
	}

	@SubscribeMessage("display:join")
	async handleJoinDisplay(client: Socket, accessCode: string) {
		// TODO: Verify access code
		await client.join(`display:${accessCode}`)
	}

	// Called from QueueService when status changes
	async emitDisplayUpdate(departmentId: string, displayData: any) {
		this.server.to(`display:${departmentId}`).emit("display:update", {
			queueNumber: displayData.queueNumber,
			patientName: displayData.patientName,
			counter: displayData.counter,
			status: displayData.status,
		})
	}

	// For audio announcements
	async emitAnnouncement(
		departmentId: string,
		data: {
			fileNumber: string
			name: string
			counter: number
		}
	) {
		this.server.to(`display:${departmentId}`).emit("display:announce", data)
	}
}
