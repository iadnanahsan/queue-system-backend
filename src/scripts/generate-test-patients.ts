// Department configs
const departments = [
	{
		id: "613c90b8-a72e-4463-8a28-084e1b4f9d2d",
		name_en: "Cardiology",
		name_ar: "طب القلب",
		prefix: "C",
	},
	{
		id: "90c6ae9e-3402-4e1a-b09d-e7f25547ba55",
		name_en: "Dermatology",
		name_ar: "طب الجلد",
		prefix: "D",
	},
	{
		id: "d0a617b3-13ff-45bd-a998-d008f245dfae",
		name_en: "Gastroenterology",
		name_ar: "طب الجهاز الهضمي",
		prefix: "G",
	},
]

import axios, {AxiosError} from "axios"
import * as fs from "fs"
import {DataSource} from "typeorm"
import {QueueEntry} from "../modules/queue/entities/queue-entry.entity"
import {Department} from "../entities/department.entity"
import {Counter} from "../entities/counter.entity"
import {DisplayAccessCode} from "../entities/display-access-code.entity"
import {User} from "../entities/user.entity"
import {config} from "dotenv"

// Load environment variables
config()

// Create TypeORM DataSource
const AppDataSource = new DataSource({
	type: "postgres",
	host: process.env.POSTGRES_HOST,
	port: parseInt(process.env.POSTGRES_PORT || "5432"),
	username: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
	database: process.env.POSTGRES_DB,
	entities: [Department, QueueEntry, Counter, DisplayAccessCode, User],
	synchronize: false,
})

async function removePatients() {
	try {
		console.log("Starting patient removal process...")

		// Initialize the connection
		const connection = await AppDataSource.initialize()

		for (const dept of departments) {
			console.log(`\nProcessing ${dept.name_en}...`)

			// First, let's count total patients in this department
			const countResult = await connection.query(
				`SELECT COUNT(*) as total FROM queue_entries WHERE department_id = $1`,
				[dept.id]
			)
			const totalPatients = parseInt(countResult[0].total)

			// Now delete all except the first 50
			const result = await connection.query(
				`
                WITH RankedPatients AS (
                    SELECT id, 
                           ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
                    FROM queue_entries
                    WHERE department_id = $1
                )
                DELETE FROM queue_entries
                WHERE id IN (
                    SELECT id 
                    FROM RankedPatients 
                    WHERE rn > 50
                )
                RETURNING id;
            `,
				[dept.id]
			)

			const removedCount = result.length
			const remainingCount = totalPatients - removedCount
			console.log(`Department ${dept.name_en}:`)
			console.log(`- Total patients before: ${totalPatients}`)
			console.log(`- Patients removed: ${removedCount}`)
			console.log(`- Patients remaining: ${remainingCount}`)

			await new Promise((resolve) => setTimeout(resolve, 1000))
		}

		await connection.destroy()
		console.log("\nPatient removal completed!")
	} catch (error) {
		if (error instanceof Error) {
			console.error("Script failed:", error.message)
		}
		process.exit(1)
	}
}

// Run the script
removePatients()
