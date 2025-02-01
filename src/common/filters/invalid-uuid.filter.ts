import {ExceptionFilter, Catch, ArgumentsHost, BadRequestException} from "@nestjs/common"
import {Response} from "express"
import {QueryFailedError} from "typeorm"

@Catch(QueryFailedError)
export class InvalidUuidFilter implements ExceptionFilter {
	catch(exception: QueryFailedError, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()

		// Check if it's a UUID conversion error
		if (exception["code"] === "22P02" && exception["message"].includes("invalid input syntax for type uuid")) {
			return response.status(400).json({
				statusCode: 400,
				message: "Invalid UUID format",
				error: "Bad Request",
				details: "The provided ID must be a valid UUID",
			})
		}

		// For other database errors, return 500
		return response.status(500).json({
			statusCode: 500,
			message: "Internal server error",
		})
	}
}
