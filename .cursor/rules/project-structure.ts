export const projectStructure = {
	// Directory Structure Rules
	directories: {
		src: {
			config: ["database.config.ts", "typeorm.config.ts"],
			entities: ["*.entity.ts"],
			modules: {
				auth: {
					dto: ["*.dto.ts"],
					interfaces: ["*.interfaces.ts"],
					required: ["auth.controller.ts", "auth.service.ts", "auth.module.ts", "jwt.strategy.ts"],
				},
				users: ["users.service.ts", "users.module.ts"],
				common: {
					decorators: ["*.decorator.ts"],
					guards: ["*.guard.ts"],
					interfaces: ["*.interface.ts"],
				},
			},
			migrations: ["*.ts"],
		},
		docs: {
			"main-final": ["*.md"],
			required: ["development-log.md", "folder-structure.md"],
		},
	},

	// File Naming Conventions
	naming: {
		entities: {
			suffix: ".entity.ts",
			pattern: "kebab-case",
		},
		dtos: {
			suffix: ".dto.ts",
			pattern: "kebab-case",
		},
		services: {
			suffix: ".service.ts",
			pattern: "kebab-case",
		},
		controllers: {
			suffix: ".controller.ts",
			pattern: "kebab-case",
		},
		modules: {
			suffix: ".module.ts",
			pattern: "kebab-case",
		},
		interfaces: {
			suffix: ".interface.ts",
			pattern: "kebab-case",
		},
		decorators: {
			suffix: ".decorator.ts",
			pattern: "kebab-case",
		},
		guards: {
			suffix: ".guard.ts",
			pattern: "kebab-case",
		},
	},

	// Module Structure Rules
	moduleStructure: {
		required: ["module", "service", "controller"],
		optional: ["dto", "interface", "guard", "decorator"],
		naming: {
			service: "${name}.service.ts",
			controller: "${name}.controller.ts",
			module: "${name}.module.ts",
		},
	},

	// Documentation Rules
	documentation: {
		required: ["development-log.md", "folder-structure.md"],
		mainDocs: ["queue-system-backend-docs.md", "api-documentation-guide.md"],
		updateRequired: ["development-log.md"],
		format: "markdown",
	},

	// Auto-Update Triggers
	triggers: {
		fileCreation: {
			pattern: "src/**/*",
			action: "@structure",
			message: "New file detected. Update folder structure documentation.",
		},
		moduleAddition: {
			pattern: "src/modules/**/module.ts",
			action: "@structure",
			message: "New module added. Update project structure.",
		},
		codeImplementation: {
			patterns: ["src/**/*.controller.ts", "src/**/*.service.ts", "src/**/*.entity.ts"],
			action: "@log",
			message: "New implementation. Update development log.",
		},
		migrationCreation: {
			pattern: "src/migrations/*.ts",
			action: "@log",
			message: "New migration created. Update development progress.",
		},
		ruleChanges: {
			pattern: ".cursor/rules/*.ts",
			action: "@rules",
			message: "Project rules modified. Update documentation.",
		},
	},

	// Documentation Update Requirements
	updateRequirements: {
		structure: {
			files: ["docs/folder-structure.md"],
			sections: ["Directory Structure", "Purpose of Key Files"],
		},
		log: {
			files: ["docs/development-log.md"],
			required: ["timestamp", "changes", "next steps"],
		},
		rules: {
			files: [".cursor/rules/*.ts"],
			notify: true,
		},
	},
}
