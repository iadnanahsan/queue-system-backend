import {QueueStatus} from "../enums/queue-status.enum"

export const ALLOWED_STATUS_TRANSITIONS = {
	[QueueStatus.WAITING]: [QueueStatus.SERVING, QueueStatus.NO_SHOW],
	[QueueStatus.SERVING]: [QueueStatus.COMPLETED, QueueStatus.NO_SHOW],
	[QueueStatus.COMPLETED]: [], // Terminal state
	[QueueStatus.NO_SHOW]: [], // Terminal state
}

export const REQUIRES_COUNTER = [QueueStatus.SERVING, QueueStatus.COMPLETED]

export const STATUS_ACTIONS = {
	SERVE: {
		from: QueueStatus.WAITING,
		to: QueueStatus.SERVING,
	},
	COMPLETE: {
		from: QueueStatus.SERVING,
		to: QueueStatus.COMPLETED,
	},
	NO_SHOW: {
		from: [QueueStatus.WAITING, QueueStatus.SERVING],
		to: QueueStatus.NO_SHOW,
	},
}
