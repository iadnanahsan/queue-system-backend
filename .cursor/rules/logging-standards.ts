export const loggingStandards = {
	// Logging Format Standards
	format: {
		console: {
			pattern: "${timestamp} | ${level} | ${message}",
			timestamp: "YYYY-MM-DD HH:mm:ss",
			levels: ["INFO", "ERROR", "WARN", "DEBUG"],
		},
		file: {
			pattern: "${timestamp}\t${level}\t${message}",
			cleanup: ["ansiCodes", "extraSpaces", "sqlFormatting"],
		},
	},

	// Auto Documentation Rules
	documentation: {
		// Automatic log entry creation
		autoEntry: {
			trigger: "fileChange",
			locations: ["src/config/logger*.ts", "src/main.ts"],
			template: {
				title: "Logger: {action} - {component}",
				format: `
					### {title} ({timestamp})

					Files Modified:
					{files}

					Changes:
					\`\`\`diff
					{diffContent}
					\`\`\`

					Impact:
					{impact}

					Next Steps:
					{nextSteps}
				`,
			},
			required: ["files", "diffContent", "impact"],
		},
		// Verification steps
		verification: {
			preCommit: ["checkLogFormat", "validateTimestamp", "ensureDocumentation"],
			postChange: ["updateDevelopmentLog", "verifyLogRotation", "checkFileSize"],
		},
	},

	// Automated Actions
	actions: {
		onLoggerChange: [
			{
				type: "updateDoc",
				file: "docs/development-log.md",
				automatic: true,
				priority: "critical",
			},
			{
				type: "verifyFormat",
				target: "logs/*.log",
				automatic: true,
			},
		],
	},
}
