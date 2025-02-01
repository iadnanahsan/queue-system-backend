# Project Folder Structure

## Current Implementation

```
├── config/
  ├── cors.config.ts          # CORS security configuration
  ├── database.config.ts      # Database connection settings
  ├── logger.config.ts        # Winston logger setup
  └── typeorm.config.ts       # Migration configuration
├── entities/
  ├── counter.entity.ts       # Counter data model
  ├── department.entity.ts
  ├── display-access-code.entity.ts
  ├── index.ts
  ├── queue-entry.entity.ts
  └── user.entity.ts
├── migrations/
  ├── 1738276871093-InitialSchema.ts        # Initial database setup
  └── 1738276871094-QueueSystemEntities.ts  # Queue system tables
├── modules/
  ├── auth/                  # Authentication module
    ├── dto/
      └── login.dto.ts       # Login validation
    ├── interfaces/
      └── auth.interfaces.ts # Auth types
    ├── auth.controller.ts   # Auth endpoints
    ├── auth.module.ts       # Module config
    ├── auth.service.ts      # Auth logic
    └── jwt.strategy.ts      # JWT handling
  ├── common/               # Shared functionality
    ├── decorators/
      └── roles.decorator.ts # Role-based access
    ├── guards/             # Auth guards
    ├── interfaces/
      └── jwt-payload.interface.ts
  ├── counters/            # Counter management
    ├── entities/
      └── counter.entity.ts # Counter model
  ├── departments/         # Department management
    ├── dto/
      └── create-department.dto.ts
    ├── entities/
      └── department.entity.ts
    ├── departments.controller.ts
    └── departments.service.ts
  ├── queue/              # Queue management
    ├── dto/
      └── register-patient.dto.ts
    ├── entities/
      └── queue-entry.entity.ts
    ├── interfaces/
      └── queue-number.interface.ts
    ├── services/
      └── queue-number.service.ts
    ├── queue.controller.ts
    ├── queue.module.ts
    └── queue.service.ts
  ├── seed/              # Database seeding
    ├── seed.module.ts
    └── seed.service.ts
  ├── users/            # User management
    ├── dto/
      └── create-admin.dto.ts
    ├── users.module.ts
    └── users.service.ts
├── utils/             # Utility functions
  ├── file-watcher.ts           # File monitoring
  ├── list-structure.js         # Structure generator
  ├── list-structure.ts         # Structure generator (TS)
  ├── log-automation.ts         # Automated logging
  ├── requirement-review.ts     # Requirements tracking
  ├── task-completion-tracker.ts # Task tracking
  ├── task-dependency-validator.ts # Task dependencies
  ├── task-matcher.ts          # Task detection
  └── task-tracker.ts          # Progress tracking
├── app.module.ts     # Root module
└── main.ts          # Application entry
```

## Project Rules

```
.cursor/rules/
├── commands.ts                # Command definitions
├── folder-structure.ts        # Structure validation
├── logging-standards.ts       # Logging format
├── project-structure.ts       # Project organization
├── requirements-compliance.ts # Requirements tracking
└── task-priority.ts          # Task priority rules
```

## Documentation

```
docs/
├── development-log.md         # Development progress
├── folder-structure.md        # Project structure
├── task-completion.json       # Task tracking
└── main-final/
    ├── queue-system-backend-docs.md  # System documentation
    └── api-documentation-guide.md    # API guide
```
