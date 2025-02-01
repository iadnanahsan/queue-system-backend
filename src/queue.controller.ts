import {Controller, Get, Res} from "@nestjs/common"
import {Response} from "express"

@Controller("events")
export class EventsController {
	@Get("sse")
	sse(@Res() res: Response) {
		res.setHeader("Content-Type", "text/event-stream")
		res.setHeader("Cache-Control", "no-cache")
		res.setHeader("Connection", "keep-alive")

		setInterval(() => {
			res.write(`data: ${JSON.stringify({message: "New event", timestamp: new Date()})}\n\n`)
		}, 3000) // Sends an event every 3 seconds
	}
}
