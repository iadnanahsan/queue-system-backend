import {createLogger, format, transports} from "winston"
import DailyRotateFile = require("winston-daily-rotate-file")
import * as path from "path"

const logDir = "logs"

const {combine, timestamp, printf} = format

const myFormat = printf(({level, message, timestamp}) => {
	return `${timestamp} ${level}: ${message}`
})

export const loggerConfig = {
	// File transport
	fileTransport: new transports.DailyRotateFile({
		filename: path.join(logDir, "console-%DATE%.log"),
		datePattern: "YYYY-MM-DD",
		zippedArchive: true,
		maxSize: "20m",
		maxFiles: "14d",
		format: combine(timestamp(), myFormat),
	}),

	// Console transport
	consoleTransport: new transports.Console({
		format: combine(timestamp(), myFormat),
	}),
}

export const logger = createLogger({
	transports: [loggerConfig.fileTransport, loggerConfig.consoleTransport],
})
