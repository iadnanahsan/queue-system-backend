export interface QueueNumber {
	prefix: string // Department prefix (e.g., 'A')
	number: number // Sequential number
	formatted: string // Combined format (e.g., 'A-001')
	timestamp: Date // Generation timestamp
	departmentId: string // Associated department
	priority: boolean // Priority status
}

export interface QueueStatus {
	id: string
	queueNumber: string
	status: "waiting" | "serving" | "completed" | "no_show"
	counter?: number
	waitTime?: number // Time in queue (minutes)
	serveTime?: number // Time being served (minutes)
}
