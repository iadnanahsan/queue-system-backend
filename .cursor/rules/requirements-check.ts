export const requirementsCheck = {
	// Core Requirements Verification
	coreRequirements: {
		queueSystem: {
			file: "docs/main-final/queue-system-backend-docs.md",
			checkPoints: [
				"Hospital departments setup",
				"Queue number generation",
				"Counter management",
				"Display screen integration",
				"Real-time updates",
			],
		},
		api: {
			file: "docs/main-final/api-documentation-guide.md",
			standards: [
				"RESTful principles",
				"JWT authentication",
				"Role-based access",
				"Input validation",
				"Error handling",
			],
		},
	},

	// Reminder Triggers
	requirementChecks: {
		onFileChange: {
			"src/modules/**/*.ts": {
				command: "@req-check",
				message: "Verify changes align with system requirements",
			},
			"src/controllers/**/*.ts": {
				command: "@api-check",
				message: "Ensure API endpoints follow documentation guidelines",
			},
		},
		beforeCommit: {
			verify: ["@req-check", "@api-check"],
			blockIfNotCompliant: true,
		},
	},

	// Command Templates
	commands: {
		"@req-check": {
			description: "Verify requirement compliance",
			checkList: [
				"Does this change fulfill core requirements?",
				"Is it documented in queue-system-backend-docs.md?",
				"Have all edge cases been considered?",
			],
		},
		"@api-check": {
			description: "Verify API compliance",
			checkList: [
				"Does endpoint follow REST principles?",
				"Is authentication properly implemented?",
				"Are all responses documented?",
				"Is input validation complete?",
			],
		},
	},
}
