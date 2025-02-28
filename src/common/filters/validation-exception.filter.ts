import {ExceptionFilter, Catch, ArgumentsHost, BadRequestException} from "@nestjs/common"
import {Response} from "express"
import {ValidationError} from "class-validator"

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
	catch(exception: BadRequestException, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const status = exception.getStatus()
		const exceptionResponse = exception.getResponse() as any

		// Check if this is a validation error
		if (Array.isArray(exceptionResponse.message)) {
			const messages = exceptionResponse.message

			// Check for property should not exist errors
			const nonWhitelistedErrors = messages.filter(
				(msg) => typeof msg === "string" && msg.includes("should not exist")
			)

			if (nonWhitelistedErrors.length > 0) {
				// Extract property names from error messages
				const propertyNames = nonWhitelistedErrors
					.map((msg) => {
						const match = msg.match(/property (\w+) should not exist/)
						return match ? match[1] : null
					})
					.filter(Boolean)

				// Create a more helpful error message
				const errorResponse = {
					statusCode: status,
					error: "Validation Error",
					message: "Invalid property names in request",
					details: "The API expects snake_case property names. Please check your request payload.",
					invalidProperties: propertyNames,
					suggestion: 'For example, use "department_id" instead of "departmentId"',
				}

				return response.status(status).json(errorResponse)
			}
		}

		// If not a property name error, pass through the original error
		return response.status(status).json(exceptionResponse)
	}
}
