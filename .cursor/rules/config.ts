export const configRules = {
	// Environment variables from documentation
	required: {
		server: ["NODE_ENV", "PORT", "API_URL"],
		database: ["POSTGRES_HOST", "POSTGRES_PORT", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"],
		redis: ["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD"],
		jwt: ["JWT_SECRET", "JWT_EXPIRES_IN"],
		websocket: ["WS_PATH"],
	},

	// Default values from documentation and .env
	defaults: {
		jwt: {
			expiresIn: "8h",
		},
		websocket: {
			path: "/socket.io",
		},
		database: {
			port: 5432,
			host: "localhost",
		},
		server: {
			port: 3000,
		},
	},
}
