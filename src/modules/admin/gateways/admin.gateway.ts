import {WebSocketGateway, WebSocketServer, SubscribeMessage} from "@nestjs/websockets"
import {Server, Socket} from "socket.io"
import {AdminStatsService} from "../services/stats.service"
import {AdminStatsResponseDto} from "../dto/stats-response.dto"

@WebSocketGateway({
	namespace: "admin",
})
export class AdminGateway {
	@WebSocketServer()
	private server: Server

	constructor(private statsService: AdminStatsService) {}

	@SubscribeMessage("stats:subscribe")
	async handleStatsSubscribe(client: Socket) {
		client.join("stats-room")
	}

	async emitStatsUpdate(stats: AdminStatsResponseDto) {
		this.server.to("stats-room").emit("stats:update", stats)
	}
}
