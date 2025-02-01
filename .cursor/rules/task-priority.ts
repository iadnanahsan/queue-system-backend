export const taskPriorityRules = {
	enforcement: {
		blockLowerPriority: true, // Block lower priority tasks if higher priority tasks are pending
		warningMessage: "⚠️ Higher priority tasks are pending. Consider completing them first.",
	},

	priorities: {
		CRITICAL: {
			description: "Core patient flow functionality",
			mustCompleteFirst: true,
			examples: ["Queue generation", "Patient registration"],
		},
		HIGH: {
			description: "Essential staff operations",
			requiresCriticalDone: true,
			examples: ["Counter management", "Department operations"],
		},
		MEDIUM: {
			description: "Enhancement features",
			requiresHighDone: true,
			examples: ["Display system", "Notifications"],
		},
		LOW: {
			description: "Nice-to-have features",
			requiresMediumDone: true,
			examples: ["Analytics", "Reports"],
		},
	},

	validation: {
		checkDependencies: true,
		enforceOrder: true,
		allowOverride: false,
	},
}
