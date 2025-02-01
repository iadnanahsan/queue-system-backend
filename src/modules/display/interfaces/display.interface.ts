export interface DepartmentQueueDisplay {
	queueNumber: string
	patientName: string
	counter: number
	status: string
}

export interface MultiDepartmentDisplay {
	departmentId: string
	name_en: string
	name_ar: string
	queues: {
		counter: number
		current: DepartmentQueueDisplay | null
	}[]
}
