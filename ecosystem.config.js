require("dotenv").config() // Load .env variables
require("crypto") // Ensure `crypto` is available

module.exports = {
	apps: [
		{
			name: "queue-system",
			script: "npm",
			args: "run prod", // ✅ Use the same script as `npm run prod`
			interpreter: "/usr/bin/node", // ✅ Ensure the correct Node.js version
			instances: 1,
			exec_mode: "fork",
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
				PORT: 4490, // ✅ Ensure it matches .env
				CORS_ORIGIN: "https://queue.mchd-manager.com",
			},
		},
	],
}
