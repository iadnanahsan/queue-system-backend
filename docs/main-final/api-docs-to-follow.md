# Queue Management System - API Documentation

## Overview
API documentation and testing setup for the Queue Management System.

## Swagger Documentation

### Setup
```typescript
// main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestJS.create(AppModule);

    const config = new DocumentBuilder()
        .setTitle('Hospital Queue Management System')
        .setDescription('API Documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
}
```

## API Endpoints

### 1. Authentication
```typescript
// Login
POST /api/auth/login
Body: {
    username: string;
    password: string;
}
Response: {
    token: string;
    user: {
        id: string;
        username: string;
        role: string;
        departmentId?: string;
    }
}
```

### 2. Reception Panel
```typescript
// Create New Queue Entry
POST /api/queue/new
Auth: Required (Receptionist)
Body: {
    fileNumber: string;
    patientName: string;
    departmentId: string;
}
Response: {
    id: string;
    queueNumber: string;  // Format: [A-Z]-[000]
    fileNumber: string;
    patientName: string;
    departmentId: string;
    status: 'waiting';
    createdAt: Date;
}

// Get Departments List
GET /api/departments
Auth: Required
Response: Department[]
```

### 3. Counter Staff Panel
```typescript
// Get Department Queue
GET /api/queue/department/:departmentId
Auth: Required (Counter Staff)
Response: QueueEntry[]

// Select Counter
POST /api/counter/select
Auth: Required (Counter Staff)
Body: {
    counterId: number;
}

// Next Patient
POST /api/queue/next
Auth: Required (Counter Staff)
Response: QueueEntry | null

// Mark No Show
POST /api/queue/:id/no-show
Auth: Required (Counter Staff)

// Call Again
POST /api/queue/:id/call
Auth: Required (Counter Staff)
```

### 4. Display Screen
```typescript
// Access Display
GET /api/display/:departmentId
Query: {
    code: string;  // Access code
}
Response: {
    currentServing: {
        queueNumber: string;
        patientName: string;
        counter: number;
    }
}

// WebSocket Events for Display
socket.on('display:update', (data: {
    queueNumber: string;
    patientName: string;
    counter: number;
}))
```

### 5. Admin Panel
```typescript
// Manage Access Codes
POST /api/admin/display/code
Auth: Required (Admin)
Body: {
    departmentId: string;
}
Response: {
    accessCode: string;
}

GET /api/admin/display/codes
Auth: Required (Admin)
Response: {
    departmentId: string;
    accessCode: string;
    isActive: boolean;
}[]

// Basic Reports
GET /api/admin/reports/daily
Auth: Required (Admin)
Query: {
    date: string;
    departmentId?: string;
}
```

## Postman Collection Setup

### Environment Variables
```json
{
    "dev": {
        "baseUrl": "http://localhost:3000",
        "token": ""
    }
}
```

### Collection Structure
```
Queue System API/
├── Authentication/
│   └── Login
├── Reception/
│   ├── Create Queue Entry
│   └── Get Departments
├── Counter Staff/
│   ├── Select Counter
│   ├── Get Department Queue
│   ├── Next Patient
│   ├── No Show
│   └── Call Again
├── Display/
│   └── Access Display
└── Admin/
    ├── Create Access Code
    └── View Reports
```

### Login Request Example
```json
{
    "name": "Login",
    "request": {
        "method": "POST",
        "header": [
            {
                "key": "Content-Type",
                "value": "application/json"
            }
        ],
        "body": {
            "mode": "raw",
            "raw": "{\"username\":\"staff1\",\"password\":\"password123\"}"
        },
        "url": "{{baseUrl}}/api/auth/login"
    },
    "event": [
        {
            "listen": "test",
            "script": {
                "exec": [
                    "var jsonData = pm.response.json();",
                    "pm.environment.set(\"token\", jsonData.token);"
                ]
            }
        }
    ]
}
```

### How to Use Collection

1. Import Steps for Frontend Developer:
```markdown
1. Open Postman
2. Import Collection (File > Import)
3. Import Environment
4. Select Environment in dropdown
5. Use Login request first
6. Other requests will automatically use token
```

2. Testing Flow:
```markdown
1. Login as receptionist
   - Create queue entry
2. Login as counter staff
   - Select counter
   - Get queue
   - Process patients
3. Access display screen
   - Use access code
   - Watch for updates
```

Would you like me to add more details to any section or include additional endpoint examples?