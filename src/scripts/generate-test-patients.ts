import axios, {AxiosError} from "axios"
import * as fs from "fs"
import {config} from "dotenv"

// Load environment variables
config()

// Configuration
const API_URL = "http://localhost:5000"
const TOTAL_PATIENTS_PER_DEPT = 60

// Department configs

// const departments = [
// 	{
// 		id: "49b248c7-7722-43b8-800c-c52f47a1f6d6",
// 		name_en: "Orthopedics",
// 		name_ar: "قسم العظام",
// 		prefix: "O",
// 	},
// 	{
// 		id: "64ff420a-eaac-4fd3-92da-a801f76b37c3",
// 		name_en: "Neurology",
// 		name_ar: "قسم الأعصاب",
// 		prefix: "N",
// 	},
// 	{
// 		id: "90c6ae9e-3402-4e1a-b09d-e7f25547ba55",
// 		name_en: "Dermatology",
// 		name_ar: "طب الجلد",
// 		prefix: "D",
// 	},
// ]

const departments = [
	{
		id: "49b248c7-7722-43b8-800c-c52f47a1f6d6",
		name_en: "Orthopedics",
		name_ar: "قسم العظام",
		prefix: "O",
	},
	{
		id: "613c90b8-a72e-4463-8a28-084e1b4f9d2d",
		name_en: "Cardiology",
		name_ar: "طب القلب",
		prefix: "C",
	},
	{
		id: "64ff420a-eaac-4fd3-92da-a801f76b37c3",
		name_en: "Neurology",
		name_ar: "قسم الأعصاب",
		prefix: "N",
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
	{
		id: "ffef807c-f9cb-4b18-af88-f7bddbfe9977",
		name_en: "Pediatrics",
		name_ar: "قسم الأطفال",
		prefix: "P",
	},
]

// Breaking Bad Universe Names (expanded)
const characterNames = [
	"Walter White",
	"Jesse Pinkman",
	"Skyler White",
	"Hank Schrader",
	"Saul Goodman",
	"Gus Fring",
	"Mike Ehrmantraut",
	"Kim Wexler",
	"Chuck McGill",
	"Howard Hamlin",
	"Nacho Varga",
	"Lalo Salamanca",
	"Tuco Salamanca",
	"Hector Salamanca",
	"Jane Margolis",
	"Todd Alquist",
	"Lydia Rodarte-Quayle",
	"Huell Babineaux",
	"Ted Beneke",
	"Skinny Pete",
	"Badger",
	"Andrea Cantillo",
	"Brock Cantillo",
	"Carmen Molina",
	"Don Eladio",
	"Domingo Gallardo",
	"Elliott Schwartz",
	"Gretchen Schwartz",
	"Steven Gomez",
	"Marie Schrader",
	"Victor",
	"Tyrus Kitt",
	"Marco Salamanca",
	"Leonel Salamanca",
	"Gale Boetticher",
	"Craig Kettleman",
	"Betsy Kettleman",
	"Ernesto",
	"Cliff Main",
	"Rich Schweikart",
	"Paige Novick",
	"Viola Goto",
	"Erin Brill",
	"Omar",
	"Francesca Liddy",
]

// Generate unique file numbers
function generateFileNumber() {
	return `F${Math.floor(10000 + Math.random() * 90000)}`
}

async function login() {
	try {
		console.log("Attempting to login...")
		const response = await axios.post(`${API_URL}/auth/login`, {
			username: "Receptionist",
			password: "Receptionist123",
		})
		console.log("Login successful")
		return response.data.access_token
	} catch (error) {
		if (error instanceof AxiosError) {
			console.error("Login failed:", error.response?.data || error.message)
			console.error("Full error:", error)
		} else {
			console.error("Unknown error during login:", error)
		}
		throw error
	}
}

async function createPatient(token: string, data: any) {
	try {
		const response = await axios.post(
			`${API_URL}/queue/register`,
			{
				department_id: data.departmentId,
				file_number: data.fileNumber,
				patient_name: data.patientName,
			},
			{
				headers: {Authorization: `Bearer ${token}`},
			}
		)
		return response.data
	} catch (error) {
		if (error instanceof AxiosError) {
			console.error(`Failed to create patient ${data.patientName}:`, error.response?.data || error.message)
		}
		fs.appendFileSync("failed_entries.log", JSON.stringify(data) + "\n")
		return null
	}
}

async function generatePatients() {
	try {
		console.log("Starting patient generation...")
		const token = await login()

		const usedFileNumbers = new Set<string>()
		const usedNames = new Set<string>()

		for (const dept of departments) {
			console.log(`\nGenerating patients for ${dept.name_en}...`)
			let created = 0
			let retries = 0
			const maxRetries = 3

			while (created < TOTAL_PATIENTS_PER_DEPT && retries < maxRetries) {
				const batch = Math.min(20, TOTAL_PATIENTS_PER_DEPT - created) // Smaller batch size
				const promises = []

				for (let i = 0; i < batch; i++) {
					let fileNumber
					do {
						fileNumber = generateFileNumber()
					} while (usedFileNumbers.has(fileNumber))
					usedFileNumbers.add(fileNumber)

					let uniqueName
					do {
						const baseName = characterNames[Math.floor(Math.random() * characterNames.length)]
						uniqueName = `Patient ${baseName} ${Math.floor(Math.random() * 1000)}`
					} while (usedNames.has(uniqueName))
					usedNames.add(uniqueName)

					const patientData = {
						patientName: uniqueName,
						fileNumber: fileNumber,
						departmentId: dept.id,
					}

					promises.push(createPatient(token, patientData))

					// Add delay between requests in the same batch
					await new Promise((resolve) => setTimeout(resolve, 100))
				}

				const results = await Promise.all(promises)
				const successfulCreations = results.filter((r) => r !== null).length
				created += successfulCreations

				if (successfulCreations < batch) {
					retries++
					console.log(`Retry ${retries}/${maxRetries} for ${dept.name_en}`)
					await new Promise((resolve) => setTimeout(resolve, 5000)) // Longer wait between retries
				}

				console.log(`Progress: ${created}/${TOTAL_PATIENTS_PER_DEPT} for ${dept.name_en}`)
			}

			// Wait between departments
			await new Promise((resolve) => setTimeout(resolve, 3000))
			console.log(`Completed ${dept.name_en}: ${created} patients created`)
		}

		console.log("\nPatient generation completed!")
	} catch (error) {
		console.error("Script failed:", error)
		process.exit(1)
	}
}

// Run the script
generatePatients()
