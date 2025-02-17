import {registerDecorator, ValidationOptions, ValidationArguments} from "class-validator"
import {isUUID} from "class-validator"
import {ALL_DEPARTMENTS_ID} from "../constants/display.constants"

export function IsUUIDOrAll(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "isUUIDOrAll",
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any, args: ValidationArguments) {
					return value === ALL_DEPARTMENTS_ID || isUUID(value, "4")
				},
				defaultMessage(args: ValidationArguments) {
					return "departmentId must be a valid UUID or 'ALL'"
				},
			},
		})
	}
}
