import {TypeOrmModuleOptions} from "@nestjs/typeorm"
import {ConfigService} from "@nestjs/config"
import {User} from "../entities/user.entity"
import {Department} from "../entities/department.entity"
import {Counter} from "../entities/counter.entity"
import {QueueEntry} from "../entities/queue-entry.entity"
import {DisplayAccessCode} from "../entities/display-access-code.entity"

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
	type: "postgres",
	host: configService.get("POSTGRES_HOST"),
	port: configService.get("POSTGRES_PORT"),
	username: configService.get("POSTGRES_USER"),
	password: configService.get("POSTGRES_PASSWORD"),
	database: configService.get("POSTGRES_DB"),
	entities: [User, Department, Counter, QueueEntry, DisplayAccessCode],
	migrations: ["dist/migrations/*{.ts,.js}"],
	synchronize: false, // Set to false in production
	logging: true,
})
