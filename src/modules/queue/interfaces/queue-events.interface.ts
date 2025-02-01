export interface QueueEvents {
	// When new patient is registered
	"queue:new": {
		departmentId: string
		entry: QueueEntry
	}

	// When patient status changes (called/serving/completed/no-show)
	"queue:status": {
		departmentId: string
		entry: QueueEntry
		previousStatus: QueueStatus
		newStatus: QueueStatus
		counterId?: number
	}

	// When counter calls patient
	"queue:call": {
		departmentId: string
		entry: QueueEntry
		counter: number
	}

	// When patient is completed and next is auto-called
	"queue:next": {
		departmentId: string
		completed: QueueEntry
		next?: QueueEntry // Optional - might not have next patient
	}
}
