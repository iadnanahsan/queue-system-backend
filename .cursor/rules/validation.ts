export const validationRules = {
	// Based on database schema constraints
	user: {
		username: {
			type: "varchar",
			maxLength: 100,
			unique: true,
		},
		role: {
			type: "varchar",
			maxLength: 20,
			allowedValues: ["admin", "receptionist", "counter_staff"],
		},
	},

	department: {
		name_en: {
			type: "varchar",
			maxLength: 100,
		},
		name_ar: {
			type: "varchar",
			maxLength: 100,
		},
		prefix: {
			type: "char",
			length: 1,
			unique: true,
		},
	},

	queueEntry: {
		queue_number: {
			type: "varchar",
			maxLength: 10,
		},
		file_number: {
			type: "varchar",
			maxLength: 50,
		},
		patient_name: {
			type: "varchar",
			maxLength: 100,
		},
		status: {
			type: "varchar",
			maxLength: 20,
			allowedValues: ["waiting", "serving", "completed", "no_show"],
		},
	},

	displayAccessCode: {
		access_code: {
			type: "varchar",
			maxLength: 50,
			unique: true,
		},
	},
}
