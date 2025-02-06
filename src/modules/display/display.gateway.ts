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
import {DisplayService} from "./display.service"

@WebSocketGateway({
	cors: {
		origin: ["https://queue.mchd-manager.com", "http://localhost:5000"],
		credentials: true,
	},
	namespace: "display",
})
export class DisplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(private readonly displayService: DisplayService) {}

	@WebSocketServer()
	server: Server

	private connectedDisplays = new Map<string, Set<string>>() // code -> Set of socket IDs

	private debug(message: string, ...args: any[]) {
		console.log(`[DisplayGateway] ${message}`, ...args)
	}

	async handleConnection(client: Socket) {
		const code = client.handshake.query.code as string
		if (code) {
			if (!this.connectedDisplays.has(code)) {
				this.connectedDisplays.set(code, new Set())
			}
			this.connectedDisplays.get(code).add(client.id)
		}
		this.debug(`Display client connected: ${client.id}`)
	}

	async handleDisconnect(client: Socket) {
		const code = client.handshake.query.code as string
		if (code && this.connectedDisplays.has(code)) {
			this.connectedDisplays.get(code).delete(client.id)
			if (this.connectedDisplays.get(code).size === 0) {
				this.connectedDisplays.delete(code)
			}
		}
		console.log(`Display client disconnected: ${client.id}`)
	}

	@SubscribeMessage("display:join")
	async handleJoinDisplay(client: Socket, accessCode: string) {
		if (!accessCode) {
			client.emit("display:error", "Access code required")
			return
		}

		try {
			// Just join the room with access code
			await client.join(`display:${accessCode}`)
			this.debug(`Client ${client.id} joined display: ${accessCode}`)

			client.emit("display:joined", {success: true, room: accessCode})
		} catch (error) {
			client.emit("display:error", "Invalid access code")
		}
	}

	async handleQueueUpdate(departmentId: string, accessCode: string) {
		try {
			// Get display data
			const display = await this.displayService.getDepartmentDisplay(departmentId, accessCode)

			// Emit to specific room
			this.server.to(`display:${accessCode}`).emit("display:update", display)
		} catch (error) {
			this.debug(`Error updating display: ${error}`)
		}
	}

	// Called by QueueGateway when queue updates happen
	async emitDisplayUpdate(departmentId: string, data: any) {
		try {
			const displayAccess = await this.displayService.getDisplayAccessByDepartment(departmentId)
			if (!displayAccess) {
				this.debug(`No display access found for department ${departmentId}`)
				return
			}

			// Debug to see if this is called twice
			console.log("Display Gateway Emit Called:", new Date().getTime())

			this.server.to(`display:${displayAccess.access_code}`).emit("display:update", data)
		} catch (error) {
			this.debug(`Error emitting display update: ${error}`)
		}
	}

	async emitAnnouncement(departmentId: string, data: any) {
		try {
			const displayAccess = await this.displayService.getDisplayAccessByDepartment(departmentId)
			if (displayAccess) {
				// Debug announcement data
				console.log("Display announcement data:", data)

				this.server.to(`display:${displayAccess.access_code}`).emit("display:announce", {
					queueNumber: data.queueNumber, // Include queue number
					fileNumber: data.fileNumber,
					name: data.patientName, // Frontend expects 'name'
					counter: data.counter,
				})
			}
		} catch (error) {
			this.debug(`Error emitting announcement: ${error}`)
		}
	}

	// Add this method to check for active connections
	async hasActiveConnections(code: string): Promise<boolean> {
		return this.connectedDisplays.has(code) && this.connectedDisplays.get(code).size > 0
	}
}
