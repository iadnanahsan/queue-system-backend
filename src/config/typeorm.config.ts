import {DataSource, DataSourceOptions} from "typeorm"
import {config} from "dotenv"
import {Department} from "../entities/department.entity"
import {QueueEntry} from "../modules/queue/entities/queue-entry.entity"
import {Counter} from "../entities/counter.entity"
import {DisplayAccessCode} from "../entities/display-access-code.entity"
import {User} from "../entities/user.entity"

// Load env file first
config()

// Add debug logging
console.log("DB Config:", {
	host: process.env.POSTGRES_HOST,
	port: parseInt(process.env.POSTGRES_PORT || "5432"),
	database: process.env.POSTGRES_DB,
	username: process.env.POSTGRES_USER,
	// Don't log password
})

const options: DataSourceOptions = {
	type: "postgres",
	host: process.env.POSTGRES_HOST,
	port: parseInt(process.env.POSTGRES_PORT || "5432"),
	username: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
	database: process.env.POSTGRES_DB,
	entities: [Department, QueueEntry, Counter, DisplayAccessCode, User],
	migrations: ["src/migrations/*.ts"],
	synchronize: false,
}

const dataSource = new DataSource(options)

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
