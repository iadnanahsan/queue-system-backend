const fs = require("fs")
const path = require("path")

class ProjectStructure {
	constructor() {
		this.output = []
		this.config = {
			excluded: ["node_modules", "dist", "coverage", ".git", ".env", "logs", "*.log", "*.js.map", "*.d.ts"],
			includeSpecificFiles: {},
		}
	}

	isExcluded(name) {
		return this.config.excluded.some((pattern) => name.match(new RegExp(pattern.replace("*", ".*"))))
	}

	listFiles(dir, level = 0) {
		const entries = fs.readdirSync(dir, {withFileTypes: true})

		// Separate directories and files
		const directories = entries.filter((entry) => entry.isDirectory())
		const files = entries.filter((entry) => entry.isFile())

		// Handle directories
		directories
			.filter((dirEntry) => !this.isExcluded(dirEntry.name))
			.forEach((dirEntry) => {
				const indent = "  ".repeat(level)
				const description = this.getDescription(path.join(dir, dirEntry.name))
				this.output.push(`${indent}├── ${dirEntry.name}/${description ? ` # ${description}` : ""}`)
				this.listFiles(path.join(dir, dirEntry.name), level + 1)
			})

		// Handle files
		files
			.filter((fileEntry) => !this.isExcluded(fileEntry.name))
			.forEach((fileEntry, index) => {
				const indent = "  ".repeat(level)
				const prefix = index === files.length - 1 ? "└──" : "├──"
				const description = this.getDescription(path.join(dir, fileEntry.name))
				this.output.push(`${indent}${prefix} ${fileEntry.name}${description ? ` # ${description}` : ""}`)
			})
	}

	getDescription(filePath) {
		// Add descriptions based on file type and location
		const relativePath = path.relative("src", filePath)
		const descriptions = {
			"config/database.config.ts": "Database connection settings",
			"config/typeorm.config.ts": "Migration configuration",
			"config/logger.config.ts": "Winston logger setup",
			"config/cors.config.ts": "CORS security configuration",
			"modules/auth/auth.controller.ts": "Authentication endpoints",
			"modules/auth/auth.service.ts": "Authentication logic",
			"modules/auth/auth.module.ts": "Auth module configuration",
			"modules/auth/jwt.strategy.ts": "JWT validation strategy",
			// Add more descriptions as needed
		}

		return descriptions[relativePath] || ""
	}

	generateStructure(startDir = "src") {
		this.output = []
		this.listFiles(startDir)
		return this.output.join("\n")
	}

	saveToFile(outputFile = "docs/folder-structure-basic.md") {
		const structure = this.generateStructure()
		const content = `# Project Folder Structure\n\n\`\`\`\n${structure}\n\`\`\`\n`
		fs.writeFileSync(outputFile, content, "utf-8")
		console.log(`Folder structure saved to ${outputFile}`)
	}
}

const structureGenerator = new ProjectStructure()
structureGenerator.saveToFile()
