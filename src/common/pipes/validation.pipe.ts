import {PipeTransform, Injectable, ArgumentMetadata, BadRequestException} from "@nestjs/common"
import {isUUID} from "class-validator"

@Injectable()
export class UuidValidationPipe implements PipeTransform {
	transform(value: any, metadata: ArgumentMetadata) {
		// Check for undefined or null
		if (!value || value === "undefined" || value === "null") {
			throw new BadRequestException(`${metadata.data} is required`)
		}

		// Validate UUID format
		if (!isUUID(value)) {
			throw new BadRequestException(`${metadata.data} must be a valid UUID`)
		}

		return value
	}
}
