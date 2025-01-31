# Project Folder Structure

## Root Structure

```
queue-system/
├── src/                  # Source code
├── docs/                 # Documentation
├── .env                  # Environment variables
└── package.json         # Project dependencies
```

## Source Code (`src/`)

### Config Files

```
config/
├── database.config.ts    # Database connection settings for NestJS
└── typeorm.config.ts     # TypeORM configuration for migrations
```

### Database Entities

```
entities/
├── user.entity.ts           # User table structure
├── department.entity.ts     # Department table structure
├── counter.entity.ts        # Counter table structure
├── queue-entry.entity.ts    # Queue entries table structure
└── display-access-code.ts   # Display access codes table structure
```

### Core Application Files

```
├── main.ts              # Application entry point
└── app.module.ts        # Root application module
```

### Feature Modules

```
modules/
├── auth/               # Authentication module
│   ├── dto/           # Data validation
│   │   └── login.dto.ts
│   ├── interfaces/    # TypeScript interfaces
│   │   └── auth.interfaces.ts
│   ├── auth.controller.ts   # Login endpoints
│   ├── auth.service.ts      # Authentication logic
│   ├── auth.module.ts       # Module configuration
│   └── jwt.strategy.ts      # JWT handling
│
├── users/              # User management
│   ├── users.service.ts    # User operations
│   └── users.module.ts     # Module configuration
│
└── common/             # Shared code
    ├── decorators/    # Custom decorators
    ├── guards/        # Authentication guards
    └── interfaces/    # Shared interfaces
```

### Database Migrations

```
migrations/
└── 1738276871093-InitialSchema.ts    # Initial database structure
```

## Documentation (`docs/`)

```
docs/
├── development-log.md              # Development progress log
├── folder-structure.md            # This file
└── main-final/
    ├── queue-system-backend-docs.md   # Main documentation
    └── api-documentation-guide.md     # API documentation
```

## Purpose of Key Files

### Configuration

-   `database.config.ts`: Configures database connection for the application
-   `typeorm.config.ts`: Configures database for running migrations
-   `.env`: Stores environment variables (database credentials, JWT secret, etc.)

### Core Files

-   `main.ts`: Bootstraps the NestJS application
-   `app.module.ts`: Root module that imports all other modules

### Entities

-   `user.entity.ts`: Defines user table structure and relationships
-   `department.entity.ts`: Defines department table structure
-   `queue-entry.entity.ts`: Defines queue entry table structure
-   `counter.entity.ts`: Defines counter table structure
-   `display-access-code.entity.ts`: Defines display access codes structure

### Authentication

-   `auth.controller.ts`: Handles login requests
-   `auth.service.ts`: Contains login logic
-   `jwt.strategy.ts`: Handles JWT token validation
-   `login.dto.ts`: Validates login request data

### User Management

-   `users.service.ts`: Handles user operations (find, create, etc.)
-   `users.module.ts`: Configures user management module

### Common

-   `roles.decorator.ts`: Handles role-based access control
-   `roles.guard.ts`: Validates user roles for endpoints
-   `jwt-payload.interface.ts`: Defines JWT token structure
