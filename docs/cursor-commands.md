# Cursor Commands Quick Reference

## 1. When Adding New Files/Modules

```
@structure
- Added new module: queue
- Location: src/modules/queue/*
- Purpose: Queue management functionality
```

## 2. When Updating Development Progress

```
@log
- Added: Queue module setup
- Time: Current WIB
- Files: src/modules/queue/*
- Next: Implement queue logic
```

## 3. When Changing Project Rules

```
@rules
- Added: Queue module structure
- Updated: File naming patterns
- Changed: Module requirements
```

## Auto-Update Triggers:

-   New file created → @structure
-   Code implementation → @log
-   Pattern/rule change → @rules

## Examples:

1. Adding Auth Module:

```
@structure
- Added: src/modules/auth/*
- Purpose: User authentication
```

2. Implementing Login:

```
@log
- Added: Login endpoint
- Files: auth.controller.ts
- Next: Add JWT validation
```

3. New Naming Convention:

```
@rules
- Updated: DTO naming to kebab-case
- Pattern: create-user.dto.ts
```
