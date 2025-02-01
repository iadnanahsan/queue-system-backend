import {QueueEntry} from "../entities/queue-entry.entity"

export interface QueueSyncEvent {
	entry: QueueEntry
	timestamp: number
	version: number
	type: "UPDATE" | "NEW" | "COMPLETE"
}

export interface QueueSyncResponse {
	success: boolean
	message?: string
	latestVersion?: number
}
