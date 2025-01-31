import {loggingStandards} from "../../.cursor/rules/logging-standards"
import * as fs from "fs"
import * as path from "path"

export class LogAutomation {
	static async updateDevelopmentLog(changedFile: string, diffContent: string): Promise<void> {
		const logFile = "docs/development-log.md"
		const template = loggingStandards.documentation.autoEntry.template

		try {
			// Read existing log
			const existingLog = await fs.promises.readFile(logFile, "utf8")

			// Generate new entry
			const newEntry = this.generateLogEntry(changedFile, diffContent)

			// Insert at the correct position (after the last entry)
			const updatedLog = this.insertNewEntry(existingLog, newEntry)

			// Write back to file
			await fs.promises.writeFile(logFile, updatedLog)
		} catch (error) {
			console.error("Failed to update development log:", error)
			throw error
		}
	}

	private static generateLogEntry(changedFile: string, diffContent: string): string {
		const now = new Date()
		const timestamp = now.toLocaleString("en-US", {
			timeZone: "Asia/Jakarta",
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})

		return `### ${this.getTitle(changedFile)} (${timestamp} WIB)

Files Modified:
-   ✅ ${changedFile}

Changes Made:
\`\`\`diff
${diffContent}
\`\`\`

Next Steps:
${this.generateNextSteps(changedFile)}
`
	}

	private static getTitle(file: string): string {
		// Extract meaningful title from file changes
		const component = path.basename(file, path.extname(file))
		return `Updated: ${component} Configuration`
	}

	private static generateNextSteps(file: string): string {
		// Generate relevant next steps based on the file changed
		return `-   Verify changes in ${path.basename(file)}
-   Test updated functionality
-   Update related documentation`
	}

	private static insertNewEntry(existingLog: string, newEntry: string): string {
		// Find the position after the last entry
		const insertPosition = existingLog.indexOf("## Current Status")
		if (insertPosition === -1) {
			return existingLog + "\n\n" + newEntry
		}
		return existingLog.slice(0, insertPosition) + newEntry + "\n\n" + existingLog.slice(insertPosition)
	}

	static verifyLogRequirements(): boolean {
		// Implement verification logic
		return true
	}
}
