export const progressTracker = {
	// Track implementation status
	implementationStages: {
		core: {
			database: {
				status: "completed",
				items: [
					{done: true, task: "Entity definitions"},
					{done: true, task: "Initial migration"},
					{done: true, task: "Database connection"},
				],
			},
			auth: {
				status: "in_progress",
				items: [
					{done: true, task: "JWT setup"},
					{done: true, task: "Auth module structure"},
					{done: false, task: "User registration"},
					{done: false, task: "Role validation"},
				],
			},
			seeding: {
				status: "in_progress",
				items: [
					{done: true, task: "Seed module setup"},
					{done: false, task: "Test seed functionality"},
					{done: false, task: "Verify admin creation"},
				],
			},
		},
		features: {
			departments: {
				status: "pending",
				dependencies: ["auth", "seeding"],
				items: [
					{done: false, task: "Department CRUD"},
					{done: false, task: "Counter management"},
				],
			},
			queue: {
				status: "pending",
				dependencies: ["departments"],
				items: [
					{done: false, task: "Queue generation"},
					{done: false, task: "Queue status updates"},
				],
			},
			display: {
				status: "pending",
				dependencies: ["queue"],
				items: [
					{done: false, task: "Display access codes"},
					{done: false, task: "Real-time updates"},
				],
			},
		},
	},

	// Auto-update triggers
	progressUpdates: {
		onFileChange: {
			"src/modules/**/*.ts": {
				command: "@progress-check",
				action: "updateStageStatus",
			},
		},
		onMigration: {
			command: "@progress-update",
			action: "updateDatabaseStatus",
		},
	},

	// Next steps generator
	nextSteps: {
		command: "@next",
		generateFrom: {
			incomplete: "Find incomplete items from current stage",
			dependencies: "Check if dependencies are met",
			priority: "Sort by implementation order",
		},
		template: `
			## Immediate Next Steps:
			1. {current_stage_tasks}
			2. {dependency_tasks}
			3. {upcoming_stage}

			## Blocking Issues:
			- {unmet_dependencies}
			- {incomplete_prerequisites}
		`,
	},
}
