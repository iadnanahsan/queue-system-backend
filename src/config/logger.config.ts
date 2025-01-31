import {createLogger, format, transports} from "winston"
import * as DailyRotateFile from "winston-daily-rotate-file"
import * as path from "path"

const logDir = "logs"

export const consoleLogger = createLogger({
	format: format.combine(
		format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
		format.colorize(),
		format.printf(({timestamp, level, message}) => {
			// Clean up ANSI escape codes and format message
			const cleanMessage = String(message)
				.replace(/\u001b\[\d+m/g, "")
				// Simplify SQL queries
				.replace(/\s+/g, " ")
				.trim()
			return `${timestamp} | ${level} | ${cleanMessage}`
		})
	),
	transports: [
		// Console output
		new transports.Console(),
		// Daily rotating file
		new DailyRotateFile({
			filename: path.join(logDir, "console-%DATE%.log"),
			datePattern: "YYYY-MM-DD",
			zippedArchive: true,
			maxSize: "20m",
			maxFiles: "14d",
			// Clean format for file
			format: format.uncolorize(),
		}),
	],
})
