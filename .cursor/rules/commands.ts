export const cursorCommands = {
	// Command Definitions
	commands: {
		"@log": {
			description: "Update development log",
			rules: {
				// Title formatting
				title: {
					format: "{action}: {component} ({type})",
					examples: [
						"Added: User Authentication (Feature)",
						"Fixed: Database Connection (Bug)",
						"Updated: TypeORM Config (Config)",
					],
				},
				// Content requirements
				content: {
					required: ["Files Modified", "Changes Made", "Next Steps"],
					optional: ["Dependencies Added", "Configuration Changes", "Known Issues"],
					format: {
						filesModified: {
							prefix: "✅",
							indentation: 3,
							showStatus: true,
						},
						changes: {
							groupByComponent: true,
							showDetails: true,
						},
					},
				},
				// Time tracking
				timestamp: {
					format: "MMMM D, YYYY - HH:mm WIB",
					requireTimezone: true,
					validateCurrent: true,
				},
				// Version tracking
				version: {
					track: true,
					format: "v{major}.{minor}.{patch}",
					autoIncrement: "patch",
				},
			},
			// Validation rules
			validation: {
				preventDuplicates: true,
				requireChronologicalOrder: true,
				enforceConsistentFormatting: true,
				checkRelatedFiles: true,
				validateNextSteps: {
					mustBeActionable: true,
					requireDependencies: true,
					linkToPreviousChanges: true,
				},
			},
			template: `
				### {title} ({timestamp} WIB)

				{changes}
				
				**Files Modified:**
				{files}

				**Next Steps:**
				{nextSteps}
			`,
			required: ["title", "changes", "files", "nextSteps"],
			file: "docs/development-log.md",
			requirementsCheck: {
				enforce: true,
				validateAgainst: "requirementsCompliance",
			},
		},
		"@structure": {
			description: "Update folder structure",
			template: `
				## {section}

				\`\`\`
				{path}
				{structure}
				\`\`\`

				### Purpose
				{purpose}
			`,
			required: ["section", "path", "structure", "purpose"],
			file: "docs/folder-structure.md",
		},
		"@rules": {
			description: "Update project rules",
			template: `
				// {category}
				{rule}
			`,
			required: ["category", "rule"],
			file: ".cursor/rules/*.ts",
		},
		"@next": {
			description: "Show accurate next steps",
			template: `
				Current Focus: {current_stage}
				Next Steps:
				1. {immediate_tasks}
				2. {upcoming_tasks}
				
				Dependencies:
				{unmet_dependencies}
			`,
			required: ["current_stage", "immediate_tasks"],
			file: "docs/development-log.md",
		},
		"@req-validate": {
			description: "Validate changes against requirements",
			template: `
				## Requirement Validation
				
				Original Requirement:
				{requirement}
				
				Implementation:
				{implementation}
				
				Validation:
				- [ ] Matches original scope
				- [ ] No unnecessary additions
				- [ ] Follows best practices
			`,
			required: ["requirement", "implementation"],
		},
	},

	// Command Triggers
	triggers: {
		filePatterns: {
			"src/**/*.ts": "@structure",
			"src/modules/**/*.ts": "@log",
			".cursor/rules/*.ts": "@rules",
			// Add git hooks
			gitHooks: {
				"pre-commit": {
					patterns: ["src/**/*.ts"],
					action: "checkLogUpdate",
					blockIfMissing: true,
				},
			},
			// Add specific file monitoring
			"src/config/**/*.ts": {
				command: "@log",
				priority: "critical",
				autoUpdate: true,
				template: "config-change",
			},
			// Logger specific triggers
			"src/config/logger*.ts": {
				command: "@log",
				useStandard: "logging-standards",
				autoDocument: true,
				blockUntilDocumented: true,
			},
		},
		events: {
			fileCreation: ["@structure", "@log"],
			fileModification: ["@log"],
			ruleChange: ["@rules"],
		},
	},

	// Auto-completion
	autoComplete: {
		"@log": ["Added:", "Modified:", "Fixed:", "Implemented:"],
		"@structure": ["Added module:", "New component:", "Updated structure:"],
		"@rules": ["New rule:", "Updated pattern:", "Added constraint:"],
	},

	// New Reminder System
	reminders: {
		afterFileChange: {
			"src/**/*.ts": [
				{
					priority: "high",
					blocking: true,
					command: "@log",
					message: "REQUIRED: Update development-log.md with these changes",
				},
				{
					command: "@next",
					message: "Update next steps based on this change",
				},
				{
					command: "@req-check",
					message: "Verify changes align with original requirements",
				},
			],
			"src/controllers/**/*.ts": [
				{
					command: "@api-check",
					message: "Verify API compliance with documentation",
				},
			],
			"docs/**/*.md": [
				{
					command: "@structure",
					message: "Update folder structure if new components were added",
				},
				{
					command: "@date-check",
					message: "Verify the timestamp is using current Jakarta (WIB) time",
				},
			],
			".cursor/rules/**/*.ts": [
				{
					command: "@rules",
					message: "Document any changes to project rules",
				},
			],
		},
		afterCommand: {
			"@log": [
				"Verify current date (Jakarta/WIB)",
				"Don't forget to include timestamp (WIB)",
				"List all modified files",
			],
			"@structure": ["Update related documentation", "Check file purposes"],
			"@rules": ["Update cursor-commands.md if needed"],
		},
	},

	// Date verification
	dateVerification: {
		timezone: "Asia/Jakarta",
		format: "MMMM D, YYYY - HH:mm WIB",
		promptBeforeLog: true,
		requireConfirmation: true,
		dateCommands: {
			verify: "@date-check",
			update: "@date-update",
		},
	},
}
