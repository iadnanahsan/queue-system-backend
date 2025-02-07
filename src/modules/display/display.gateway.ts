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
import {PollyService} from "./polly.service"
import {Injectable} from "@nestjs/common"

@Injectable()
@WebSocketGateway({
	cors: {
		origin: ["https://queue.mchd-manager.com", "http://localhost:5000"],
		credentials: true,
	},
	namespace: "display",
})
export class DisplayGateway implements OnGatewayConnection, OnGatewayDisconnect {
	constructor(private readonly displayService: DisplayService, private readonly pollyService: PollyService) {}

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
			if (data.type === "ANNOUNCEMENT") {
				// Generate announcement text
				const announcementText = `الرقم ${data.queueNumber}، الرجاء التوجه إلى نافذة الخدمة رقم ${data.counter}`

				// Generate audio using Polly
				const audioBuffer = await this.pollyService.synthesizeSpeech(announcementText)

				// Convert buffer to base64
				const audioBase64 = audioBuffer.toString("base64")

				// Emit announcement with audio
				this.server.to(`department-${departmentId}`).emit("display:announce", {
					...data,
					audio: audioBase64,
					text: announcementText,
				})
			} else {
				// Handle other display updates as before
				this.server.to(`department-${departmentId}`).emit("display:update", data)
			}
		} catch (error) {
			console.error("Error in emitDisplayUpdate:", error)
			// Fallback to normal announcement without audio
			this.server.to(`department-${departmentId}`).emit("display:announce", data)
		}
	}

	async emitAnnouncement(departmentId: string, data: any) {
		try {
			console.log("Starting emitAnnouncement with data:", data)
			const displayAccess = await this.displayService.getDisplayAccessByDepartment(departmentId)

			if (displayAccess) {
				const announcementText = `الرقم ${data.queueNumber}، الرجاء التوجه إلى نافذة الخدمة رقم ${data.counter}`
				console.log("1. Generated announcement text:", announcementText)

				console.log("2. Calling Polly service...")
				const audioBuffer = await this.pollyService.synthesizeSpeech(announcementText)
				console.log("3. Got audio buffer of size:", audioBuffer.length)

				const audioBase64 = audioBuffer.toString("base64")
				console.log("4. Converted to base64, first 50 chars:", audioBase64.substring(0, 50))

				console.log("5. Emitting to room:", `display:${displayAccess.access_code}`)
				this.server.to(`display:${displayAccess.access_code}`).emit("display:announce", {
					queueNumber: data.queueNumber,
					fileNumber: data.fileNumber,
					name: data.name,
					counter: data.counter,
					audio: audioBase64,
					text: announcementText,
				})
				console.log("6. Announcement emitted successfully")
			} else {
				console.log("No display access found for department:", departmentId)
			}
		} catch (error) {
			console.error("Error in emitAnnouncement:", error)
			this.debug(`Error emitting announcement: ${error}`)
		}
	}

	// Add this method to check for active connections
	async hasActiveConnections(code: string): Promise<boolean> {
		return this.connectedDisplays.has(code) && this.connectedDisplays.get(code).size > 0
	}
}
