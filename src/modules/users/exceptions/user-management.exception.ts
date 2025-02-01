export class DepartmentChangeException extends Error {
	constructor(message: string) {
		super(message)
		this.name = "DepartmentChangeException"
	}
}

export class ActiveQueueException extends Error {
	constructor(message: string) {
		super(message)
		this.name = "ActiveQueueException"
	}
}
