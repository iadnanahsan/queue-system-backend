export const requirementsCompliance = {
	// Core Requirements Tracking
	coreRequirements: {
		source: "docs/main-final/queue-system-backend-docs.md",
		rules: {
			stayInScope: {
				enforce: true,
				warning: "Implementation must strictly follow original requirements",
			},
			noAssumptions: {
				enforce: true,
				warning: "Do not add features without requirement validation",
			},
			bestPractices: {
				allowed: true,
				conditions: [
					"Must not alter core functionality",
					"Should improve maintainability",
					"Must be documented",
				],
			},
		},
	},

	// Review Process
	review: {
		checkpoints: ["Compare against original requirements", "Verify no scope creep", "Validate each enhancement"],
		beforeNewFeature: ["Check requirement document", "Validate business need", "Document reasoning"],
	},

	// Implementation Guidelines
	guidelines: {
		allowed: [
			"Performance improvements",
			"Security enhancements",
			"Code quality improvements",
			"Documentation updates",
		],
		forbidden: ["Unrequested features", "Assumption-based changes", "Scope modifications"],
	},

	// Validation Process
	validation: {
		beforeCommit: {
			requirementCheck: true,
			scopeValidation: true,
			enhancementJustification: true,
		},
		documentation: {
			required: ["Requirement reference", "Implementation reasoning", "Enhancement benefits"],
		},
	},
}
