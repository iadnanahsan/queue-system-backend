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
import {Injectable, Logger} from "@nestjs/common"
import {DisplayType} from "./enums/display-type.enum"

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

	private debug(message: string) {
		console.log(`[DisplayGateway] ${message}`)
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
		this.debug(`Join attempt with code: ${accessCode}`)

		if (!accessCode) {
			client.emit("display:error", "Access code required")
			return
		}

		try {
			await client.join(`display:${accessCode}`)
			this.debug(`Client ${client.id} joined display: ${accessCode}`)
			client.emit("display:joined", {success: true, room: accessCode})
		} catch (error) {
			this.debug(`Join error: ${error instanceof Error ? error.message : "Unknown error"}`)
			client.emit("display:error", "Invalid access code")
		}
	}

	async handleQueueUpdate(departmentId: string, accessCode: string) {
		this.debug(`Queue update for department: ${departmentId}, code: ${accessCode}`)

		try {
			// Get display data
			const display = await this.displayService.getDepartmentDisplay(departmentId, accessCode)

			// Get all departments display if it exists
			const allDeptDisplays = await this.displayService.getDisplayAccessByType(DisplayType.ALL_DEPARTMENTS)

			// Emit to specific department room
			this.debug(`Emitting to department room: display:${accessCode}`)
			this.server.to(`display:${accessCode}`).emit("display:update", display)

			// If all departments display exists, emit to that room too
			if (allDeptDisplays && allDeptDisplays.length > 0) {
				const allDeptDisplay = await this.displayService.getAllDepartmentsDisplay(
					allDeptDisplays[0].access_code
				)
				this.debug(`Emitting to all departments room: display:${allDeptDisplays[0].access_code}`)
				this.server.to(`display:${allDeptDisplays[0].access_code}`).emit("display:update", allDeptDisplay)
			}
		} catch (error) {
			this.debug(`Error updating display: ${error instanceof Error ? error.message : String(error)}`)
			console.error("Full error details:", error)
		}
	}

	// Called by QueueGateway when queue updates happen
	async emitDisplayUpdate(departmentId: string, data: any) {
		try {
			this.debug(`Emitting update for department: ${departmentId}`)

			// Get department-specific display
			const departmentDisplay = await this.displayService.getDisplayAccessByDepartment(departmentId)

			// Track emitted codes to prevent duplicates
			const emittedCodes = new Set<string>()

			// If this is a serving status update, get the counter number
			const updateData = {
				...data,
				departmentId,
			}

			// If we have counter ID, get its number
			if (data.status === "serving" && data.counter) {
				const counter = await this.displayService.getCounterById(data.counter)
				if (counter) {
					updateData.counter = counter.number // Use counter.number instead of counter.id
				}
			}

			// Emit to department-specific display if exists
			if (departmentDisplay) {
				this.debug(`Emitting to department display: ${departmentDisplay.access_code}`)
				this.server.to(`display:${departmentDisplay.access_code}`).emit("display:update", updateData)
				emittedCodes.add(departmentDisplay.access_code)
			}

			// Get and emit to all-departments displays that haven't received the update
			const allDepartmentDisplays = await this.displayService.getDisplayAccessByType(DisplayType.ALL_DEPARTMENTS)

			for (const display of allDepartmentDisplays) {
				if (!emittedCodes.has(display.access_code)) {
					this.debug(`Emitting to all-departments display: ${display.access_code}`)
					this.server.to(`display:${display.access_code}`).emit("display:update", updateData)
					emittedCodes.add(display.access_code)
				}
			}

			this.debug(`Update emitted to ${emittedCodes.size} unique displays`)
		} catch (error) {
			this.debug(`Error in emitDisplayUpdate: ${error instanceof Error ? error.message : String(error)}`)
			console.error("Full error details:", error)
		}
	}

	async emitAnnouncement(departmentId: string, data: any) {
		try {
			console.log("Starting emitAnnouncement with data:", data)
			// Get both department-specific and all-departments displays
			const departmentDisplay = await this.displayService.getDisplayAccessByDepartment(departmentId)
			const allDepartmentDisplays = await this.displayService.getDisplayAccessByType(DisplayType.ALL_DEPARTMENTS)

			// Generate announcement once
			const announcementText = `الرقم ${data.queueNumber}، الرجاء التوجه إلى نافذة الخدمة رقم ${data.counter}`
			console.log("1. Generated announcement text:", announcementText)

			console.log("2. Calling Polly service...")
			const audioBuffer = await this.pollyService.synthesizeSpeech(announcementText)
			console.log("3. Got audio buffer of size:", audioBuffer.length)

			const audioBase64 = audioBuffer.toString("base64")
			console.log("4. Converted to base64, first 50 chars:", audioBase64.substring(0, 50))

			// Prepare announcement payload
			const announcement = {
				queueNumber: data.queueNumber,
				fileNumber: data.fileNumber,
				counter: data.counter,
				audio: audioBase64,
				text: announcementText,
			}

			// Emit to department-specific display
			if (departmentDisplay) {
				console.log("5. Emitting to department room:", `display:${departmentDisplay.access_code}`)
				this.server.to(`display:${departmentDisplay.access_code}`).emit("display:announce", announcement)
			}

			// Emit to all-departments displays
			if (allDepartmentDisplays && allDepartmentDisplays.length > 0) {
				for (const display of allDepartmentDisplays) {
					console.log("5. Emitting to all-departments room:", `display:${display.access_code}`)
					this.server.to(`display:${display.access_code}`).emit("display:announce", announcement)
				}
			}

			console.log("6. Announcement emitted successfully")
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
