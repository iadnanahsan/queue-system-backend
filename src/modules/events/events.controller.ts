import {Controller, Get, Res} from "@nestjs/common"
import {Response} from "express"

@Controller("events") // API will be available at /events
export class EventsController {
	@Get("sse") // SSE route: /events/sse
	sse(@Res() res: Response) {
		console.log("🔵 Received request on /events/sse")

		res.setHeader("Content-Type", "text/event-stream")
		res.setHeader("Cache-Control", "no-cache")
		res.setHeader("Connection", "keep-alive")

		res.flushHeaders() // Ensure headers are sent immediately

		setInterval(() => {
			const data = JSON.stringify({message: "New event", timestamp: new Date()})
			console.log(`📢 Sending event: ${data}`)
			res.write(`data: ${data}\n\n`)
		}, 30000) // Sends an event every 3 seconds
	}
}
