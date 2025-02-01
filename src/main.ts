import "reflect-metadata"
import {NestFactory} from "@nestjs/core"
import {SwaggerModule, DocumentBuilder} from "@nestjs/swagger"
import {AppModule} from "./app.module"
import {ValidationPipe} from "@nestjs/common"
import {SeedService} from "./modules/seed/seed.service"
import {corsConfig} from "./config/cors.config"
import {InvalidUuidFilter} from "./common/filters/invalid-uuid.filter"

import * as net from "net"

async function killPort(port: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const server = net.createServer()
		server.once("error", (err: NodeJS.ErrnoException) => {
			if (err.code === "EADDRINUSE") {
				// Port is in use, try to close it
				server.close()
				server.listen(port, () => {
					server.close()
					resolve()
				})
			} else {
				reject(err)
			}
		})
		server.once("listening", () => {
			server.close()
			resolve()
		})
		server.listen(port)
	})
}

async function bootstrap() {
	const PORT = 5000

	// Kill any process using port 5000
	try {
		await killPort(PORT)
	} catch (error) {
		console.log("Port cleanup error:", error)
	}

	const app = await NestFactory.create(AppModule, {
		logger: ["error", "warn", "log", "debug", "verbose"],
	})

	// Enable CORS with configuration
	app.enableCors(corsConfig())

	// Apply global filters
	app.useGlobalFilters(new InvalidUuidFilter())

	// Apply global pipes
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		})
	)

	// Swagger Setup
	const config = new DocumentBuilder()
		.setTitle("Hospital Queue Management System")
		.setDescription("API Documentation for Queue Management System")
		.setVersion("1.0")
		.addTag("auth", "Authentication endpoints")
		.addTag("queue", "Queue management endpoints")
		.addTag("departments", "Department management endpoints")
		.addTag("counters", "Counter management endpoints")
		.addTag("display", "Display screen endpoints")
		.addBearerAuth()
		.build()

	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup("api-docs", app, document)

	const seedService = app.get(SeedService)
	await seedService.seed()

	try {
		await app.listen(PORT)
		console.log(`Application is running on port ${PORT}`)
	} catch (error) {
		console.error("Failed to start server:", error)
		process.exit(1)
	}
}
bootstrap()
