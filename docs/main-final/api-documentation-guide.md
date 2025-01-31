# Queue Management System - Backend Technical Documentation

[Previous content remains the same...]

## API Documentation & Testing

### Swagger Implementation

1. Setup in NestJS:

```typescript
// main.ts
import {SwaggerModule, DocumentBuilder} from "@nestjs/swagger"

async function bootstrap() {
	const app = await NestJS.create(AppModule)

	const config = new DocumentBuilder()
		.setTitle("Queue Management System API")
		.setDescription("API Documentation for Hospital Queue Management")
		.setVersion("1.0")
		.addTag("auth", "Authentication endpoints")
		.addTag("queue", "Queue management")
		.addTag("department", "Department operations")
		.addTag("display", "Display screen endpoints")
		.addBearerAuth()
		.build()

	const document = SwaggerModule.createDocument(app, config)
	SwaggerModule.setup("api-docs", app, document)
}
```

2. Documenting DTOs:

```typescript
// dtos/create-queue.dto.ts
import {ApiProperty} from "@nestjs/swagger"

export class CreateQueueDto {
	@ApiProperty({
		description: "Patient file number",
		example: "F12345",
	})
	fileNumber: string

	@ApiProperty({
		description: "Patient name",
		example: "John Doe",
	})
	patientName: string

	@ApiProperty({
		description: "Department ID",
		example: "uuid-here",
	})
	departmentId: string
}
```

3. Documenting Controllers:

```typescript
// controllers/queue.controller.ts
@ApiTags("queue")
@Controller("queue")
export class QueueController {
	@ApiOperation({summary: "Create new queue entry"})
	@ApiResponse({
		status: 201,
		description: "Queue entry created",
		type: QueueEntryResponseDto,
	})
	@ApiResponse({
		status: 400,
		description: "Invalid input",
	})
	@ApiBearerAuth()
	@Post("new")
	async createEntry(@Body() entry: CreateQueueDto) {
		// Implementation
	}
}
```

### Postman Collection Setup

1. Collection Structure:

```json
{
	"info": {
		"name": "Queue Management System",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
	},
	"item": [
		{
			"name": "Authentication",
			"item": [
				{
					"name": "Login",
					"request": {
						"method": "POST",
						"header": [],
						"url": "{{baseUrl}}/auth/login",
						"body": {
							"mode": "raw",
							"raw": "{\n    \"username\": \"staff1\",\n    \"password\": \"password123\"\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						}
					}
				}
			]
		},
		{
			"name": "Queue Management",
			"item": [
				{
					"name": "Create Queue Entry",
					"request": {
						"auth": {
							"type": "bearer",
							"bearer": [
								{
									"key": "token",
									"value": "{{token}}",
									"type": "string"
								}
							]
						},
						"method": "POST",
						"header": [],
						"url": "{{baseUrl}}/queue/new"
					}
				}
			]
		}
	]
}
```

2. Environment Setup:

```json
{
	"id": "dev-environment",
	"name": "Development",
	"values": [
		{
			"key": "baseUrl",
			"value": "http://localhost:3000",
			"enabled": true
		},
		{
			"key": "token",
			"value": "",
			"enabled": true
		}
	]
}
```

3. Auto Token Management:

```javascript
// In Login request's Tests tab
pm.test("Save auth token", function () {
	var jsonData = pm.response.json()
	pm.environment.set("token", jsonData.token)
})
```

4. Role-Based Collections:

Create separate collections or folders for each role:

```plaintext
Queue Management System/
├── Admin/
│   ├── Manage Users
│   ├── Manage Departments
│   └── View Reports
├── Reception/
│   ├── Create Queue Entry
│   └── View Departments
└── Counter Staff/
    ├── View Queue
    ├── Next Patient
    └── Call Patient
```

### How to Share with Frontend

1. Export Collections:

    - In Postman, click "..." next to collection
    - Select "Export"
    - Choose "Collection v2.1"
    - Save JSON file

2. Export Environments:

    - Click gear icon (Manage Environments)
    - Click "..." next to environment
    - Export JSON file

3. Share with Frontend Developer:

    ```plaintext
    queue-system-api/
    ├── collections/
    │   ├── admin.postman_collection.json
    │   ├── reception.postman_collection.json
    │   └── counter.postman_collection.json
    ├── environments/
    │   ├── development.postman_environment.json
    │   └── staging.postman_environment.json
    └── README.md   # Import instructions
    ```

4. Import Instructions for Frontend:

```markdown
# API Collection Setup

1. Import Collections:

    - Open Postman
    - Click "Import"
    - Select collection JSON files
    - All endpoints will be imported with examples

2. Setup Environment:

    - Click "Import"
    - Select environment JSON file
    - Select imported environment in dropdown

3. Testing:
    - Use "Login" request first
    - Token will be automatically set
    - Other requests will use token
```
