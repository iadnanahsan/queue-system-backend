import "reflect-metadata"
import {NestFactory} from "@nestjs/core"
import {SwaggerModule, DocumentBuilder} from "@nestjs/swagger"
import {AppModule} from "./app.module"
import {ValidationPipe} from "@nestjs/common"
import {SeedService} from "./modules/seed/seed.service"
import {consoleLogger} from "./config/logger.config"
import {FileWatcher} from "./utils/file-watcher"

async function bootstrap() {
	// Redirect console logs
	const originalConsoleLog = console.log
	console.log = (...args) => {
		originalConsoleLog(...args)
		consoleLogger.info(args.join(" "))
	}

	const app = await NestFactory.create(AppModule, {
		logger: ["error", "warn", "log", "debug", "verbose"],
	})

	// Validation
	app.useGlobalPipes(new ValidationPipe())

	// Swagger Setup
	const config = new DocumentBuilder()
		.setTitle("Queue Management System API")
		.setDescription("API Documentation for Hospital Queue Management")
		.setVersion("1.0")
		.addTag("auth")
		.addTag("queue")
		.addTag("department")
		.addTag("display")
		.addBearerAuth()
		.build()

	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup("api-docs", app, document)

	const seedService = app.get(SeedService)
	await seedService.seed()

	await app.listen(process.env.PORT || 5000)

	// Initialize file watcher for automatic logging
	new FileWatcher()
}
bootstrap()
