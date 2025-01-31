# Queue Management System - Backend Technical Documentation

## Technology Stack (2025)

### Core Technologies

-   Runtime: Node.js v23.5.0
-   Framework: NestJS v11.0.6 (TypeScript)
-   Database: PostgreSQL (using pg v8.13.1)
-   Cache: Redis v4.7.0
-   WebSocket: Socket.IO v4.8.1
-   API: REST + WebSocket

### Key Libraries

```json
{
	"dependencies": {
		"@nestjs/common": "^11.0.6",
		"@nestjs/core": "^11.0.6",
		"@nestjs/config": "^4.0.0",
		"@nestjs/jwt": "^11.0.0",
		"@nestjs/platform-express": "^11.0.6",
		"@nestjs/platform-socket.io": "^11.0.6",
		"@nestjs/swagger": "^11.0.3",
		"@nestjs/typeorm": "^11.0.0",
		"@nestjs/websockets": "^11.0.6",
		"typeorm": "^0.3.20",
		"pg": "^8.13.1",
		"socket.io": "^4.8.1",
		"redis": "^4.7.0",
		"bcryptjs": "^2.4.3",
		"bull": "^4.16.5",
		"class-transformer": "^0.5.1",
		"class-validator": "^0.14.1",
		"winston": "^3.17.0"
	},
	"devDependencies": {
		"@types/bcryptjs": "^2.4.6",
		"@types/node": "^22.12.0",
		"@types/socket.io": "^3.0.2",
		"ts-node": "^10.9.2",
		"typescript": "^5.7.3"
	}
}
```

## Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'receptionist', 'counter_staff')),
    department_id UUID,
    counter_id INT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Departments
CREATE TABLE departments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100) NOT NULL,
    prefix CHAR(1) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counters
CREATE TABLE counters (
    id SERIAL PRIMARY KEY,
    department_id UUID NOT NULL,
    number INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    UNIQUE(department_id, number)
);

-- Queue Entries
CREATE TABLE queue_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    queue_number VARCHAR(10) NOT NULL,
    file_number VARCHAR(50) NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    department_id UUID NOT NULL,
    counter_id INT,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'serving', 'completed', 'no_show')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    served_at TIMESTAMP,
    completed_at TIMESTAMP,
    no_show_at TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (counter_id) REFERENCES counters(id)
);

-- Display Access Codes (Simplified)
CREATE TABLE display_access_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    department_id UUID NOT NULL,
    access_code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);
```

## Redis Schema

```typescript
interface RedisKeys {
    // Queue Management
    `queue:dept:${deptId}`: string[];           // Active queue numbers
    `queue:entry:${id}`: QueueEntry;            // Queue entry details
    `counter:${counterId}:current`: string;     // Current queue ID

    // Display Access
    `display:${deptId}:code`: string;          // Active display code

    // WebSocket
    `socket:user:${userId}`: string;           // Socket ID mapping
    `socket:counter:${counterId}`: string;     // Counter socket mapping

    // Rate Limiting
    `ratelimit:${ip}`: number;                 // API rate limiting
}
```

## API Implementation

### Authentication Controller

```typescript
@Controller("auth")
export class AuthController {
	@Post("login")
	async login(@Body() credentials: LoginDto): Promise<TokenResponse> {
		// Validate credentials
		const user = await this.authService.validateUser(credentials)

		// Generate JWT
		const token = this.jwtService.sign({
			sub: user.id,
			role: user.role,
			dept: user.departmentId,
		})

		return {token, user}
	}
}
```

### Queue Controller

```typescript
@Controller("queue")
export class QueueController {
	@Post("new")
	@Roles("receptionist")
	async createEntry(@Body() entry: CreateQueueDto): Promise<QueueEntry> {
		// Generate queue number
		const queueNumber = await this.queueService.generateNumber(entry.departmentId)

		// Create entry
		const newEntry = await this.queueService.create({
			...entry,
			queueNumber,
		})

		// Notify via WebSocket
		this.wsGateway.notifyNewEntry(newEntry)

		return newEntry
	}
}
```

### WebSocket Implementation

```typescript
@WebSocketGateway()
export class QueueGateway implements OnGatewayConnection {
	@SubscribeMessage("queue:subscribe")
	async handleSubscribe(@MessageBody() data: {departmentId: string}, @ConnectedSocket() client: Socket) {
		const room = `dept:${data.departmentId}`
		await client.join(room)
	}

	async notifyNewEntry(entry: QueueEntry) {
		const room = `dept:${entry.departmentId}`
		this.server.to(room).emit("queue:new", entry)
	}
}
```

## Security Implementation

### Password Hashing

```typescript
import * as bcrypt from "bcryptjs"

export class PasswordService {
	private readonly SALT_ROUNDS = 12

	async hash(password: string): Promise<string> {
		return bcrypt.hash(password, this.SALT_ROUNDS)
	}

	async verify(password: string, hash: string): Promise<boolean> {
		return bcrypt.compare(password, hash)
	}
}
```

### JWT Implementation

```typescript
import {JwtService} from "@nestjs/jwt"

interface TokenPayload {
	sub: string // User ID
	role: string // User Role
	dept?: string // Department ID
	iat?: number // Issued at
	exp?: number // Expires at
}

const JWT_CONFIG = {
	secret: process.env.JWT_SECRET,
	signOptions: {expiresIn: "8h"},
}
```

### Display Access Implementation

```typescript
@Controller("display")
export class DisplayController {
	@Get(":departmentId")
	async accessDisplay(@Param("departmentId") deptId: string, @Query("code") accessCode: string) {
		const isValid = await this.displayService.validateAccessCode(deptId, accessCode)

		if (!isValid) {
			throw new UnauthorizedException()
		}

		return this.queueService.getDepartmentDisplay(deptId)
	}
}
```

## Queue Number Generation

```typescript
export class QueueService {
	async generateNumber(departmentId: string): Promise<string> {
		const dept = await this.deptRepository.findOne(departmentId)
		const key = `queue:number:${departmentId}:${this.getTodayString()}`

		// Increment in Redis
		const number = await this.redis.incr(key)

		// Format: A-001
		return `${dept.prefix}-${number.toString().padStart(3, "0")}`
	}

	private getTodayString(): string {
		return new Date().toISOString().split("T")[0]
	}
}
```

## Offline Support

### Redis Cache Strategy

```typescript
export class CacheService {
	async cacheQueueState(departmentId: string) {
		const queue = await this.queueRepository.find({
			where: {
				departmentId,
				status: In(["waiting", "serving"]),
			},
		})

		await this.redis.set(
			`queue:state:${departmentId}`,
			JSON.stringify(queue),
			"EX",
			3600 // 1 hour
		)
	}
}
```

## Error Handling

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	catch(exception: any, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()

		let status = HttpStatus.INTERNAL_SERVER_ERROR
		let message = "Internal server error"

		if (exception instanceof HttpException) {
			status = exception.getStatus()
			message = exception.message
		}

		response.status(status).json({
			statusCode: status,
			message,
			timestamp: new Date().toISOString(),
		})
	}
}
```

## Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.example.com

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=queue_system
POSTGRES_USER=admin
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secure_password

# JWT
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=8h

# WebSocket
WS_PATH=/socket.io
```

Would you like me to expand on any particular section or add more implementation details?
