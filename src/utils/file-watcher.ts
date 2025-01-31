import * as chokidar from "chokidar"
import {LogAutomation} from "./log-automation"
import * as fs from "fs"
import {exec} from "child_process"

export class FileWatcher {
	private watcher: chokidar.FSWatcher

	constructor() {
		this.watcher = chokidar.watch(["src/**/*.ts", "docs/**/*.md"], {
			ignored: /(^|[\/\\])\../,
			persistent: true,
		})

		this.watcher.on("change", async (path) => {
			try {
				// Get diff of changes
				const diff = await this.getFileDiff(path)
				if (diff) {
					await LogAutomation.updateDevelopmentLog(path, diff)
				}
			} catch (error) {
				console.error("Error processing file change:", error)
			}
		})
	}

	private async getFileDiff(file: string): Promise<string> {
		return new Promise((resolve, reject) => {
			exec(`git diff ${file}`, (error, stdout) => {
				if (error) {
					reject(error)
					return
				}
				resolve(stdout)
			})
		})
	}
}
