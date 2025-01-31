export const rules = {
	// Database naming conventions (based on schema)
	databaseNaming: {
		tableNames: ["users", "departments", "counters", "queue_entries", "display_access_codes"],
		primaryKeyTypes: {
			uuid: ["users", "departments", "queue_entries", "display_access_codes"],
			serial: ["counters"],
		},
		timestamps: ["created_at", "served_at", "completed_at", "no_show_at", "last_login"],
	},

	// Technology versions (updated to match package.json exactly)
	versions: {
		// Core
		node: "23.5.0",
		nestjs: {
			core: "11.0.6",
			config: "4.0.0",
			jwt: "11.0.0",
			swagger: "11.0.3",
			typeorm: "11.0.0",
			websockets: "11.0.6",
			platform: {
				express: "11.0.6",
				socketio: "11.0.6",
			},
		},
		// Database & Cache
		postgresql: "8.13.1", // pg version
		typeorm: "0.3.20",
		redis: "4.7.0",
		// Utils
		socketio: "4.8.1",
		bcrypt: "2.4.3",
		bull: "4.16.5",
		winston: "3.17.0",
		// Validation
		classValidator: "0.14.1",
		classTransformer: "0.5.1",
		// Dev
		typescript: "5.7.3",
		tsNode: "10.9.2",
	},

	// WebSocket conventions (from docs)
	websocket: {
		rooms: {
			departmentFormat: "dept:${departmentId}",
		},
		events: {
			subscribe: "queue:subscribe",
			newEntry: "queue:new",
		},
	},

	// Queue number format
	queueNumber: {
		format: "${departmentPrefix}-${number}",
		numberPadding: 3,
		example: "A-001",
	},

	// Status enums (from entities)
	queueStatus: ["waiting", "serving", "completed", "no_show"],
	userRoles: ["admin", "receptionist", "counter_staff"],
}
