module.exports = {
	resources: {
		codebase: {
			path: "./src",
			description: "Source code of the NestJS application",
		},
	},
	tools: {
		startApp: {
			command: "npm",
			args: ["start"],
			description: "Start the NestJS application",
		},
	},
}
