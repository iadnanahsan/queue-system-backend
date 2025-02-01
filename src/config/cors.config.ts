import {CorsOptions} from "@nestjs/common/interfaces/external/cors-options.interface"

export const corsConfig = (): CorsOptions => {
	const isDevelopment = process.env.NODE_ENV !== "production"

	if (isDevelopment) {
		return {
			origin: process.env.CORS_ORIGIN || "*", // Allow configured origin or any in development
			methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
			credentials: true, // Allow cookies if needed
			preflightContinue: false,
			optionsSuccessStatus: 204,
		}
	}

	// Production configuration
	return {
		origin: process.env.CORS_ORIGIN, // Strict origin in production
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
		preflightContinue: false,
		optionsSuccessStatus: 204,
	}
}
