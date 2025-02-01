import "reflect-metadata"
import {DataSource, DataSourceOptions} from "typeorm"
import * as dotenv from "dotenv"
import {User} from "../entities/user.entity"
import {Department} from "../entities/department.entity"
import {Counter} from "../entities/counter.entity"
import {QueueEntry} from "../entities/queue-entry.entity"
import {DisplayAccessCode} from "../entities/display-access-code.entity"

dotenv.config()

export const dataSourceOptions: DataSourceOptions = {
	type: "postgres",
	host: process.env.POSTGRES_HOST,
	port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
	username: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
	database: process.env.POSTGRES_DB,
	entities: [User, Department, Counter, QueueEntry, DisplayAccessCode],
	migrations: ["src/migrations/*.ts"],
	migrationsTableName: "migrations",
	synchronize: false,
	logging: true,
}

const dataSource = new DataSource(dataSourceOptions)

// Initialize the DataSource
dataSource
	.initialize()
	.then(() => {
		console.log("Data Source has been initialized!")
	})
	.catch((err) => {
		console.error("Error during Data Source initialization", err)
	})

export default dataSource
