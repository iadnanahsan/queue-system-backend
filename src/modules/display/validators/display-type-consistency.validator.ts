import {registerDecorator, ValidationOptions, ValidationArguments} from "class-validator"
import {ALL_DEPARTMENTS_ID} from "../constants/display.constants"
import {DisplayType} from "../enums/display-type.enum"

export function IsDisplayTypeConsistent(validationOptions?: ValidationOptions) {
	return function (object: Object, propertyName: string) {
		registerDecorator({
			name: "isDisplayTypeConsistent",
			target: object.constructor,
			propertyName: propertyName,
			options: validationOptions,
			validator: {
				validate(value: any, args: ValidationArguments) {
					const obj = args.object as any

					// For department_specific, must have valid departmentId
					if (obj.display_type === DisplayType.DEPARTMENT_SPECIFIC) {
						return obj.departmentId && obj.departmentId !== ALL_DEPARTMENTS_ID
					}

					// For all_departments, must use ALL_DEPARTMENTS_ID
					if (obj.display_type === DisplayType.ALL_DEPARTMENTS) {
						return obj.departmentId === ALL_DEPARTMENTS_ID
					}

					return false
				},
				defaultMessage(args: ValidationArguments) {
					const obj = args.object as any
					if (obj.display_type === DisplayType.DEPARTMENT_SPECIFIC) {
						return "Department-specific displays require a valid department ID"
					}
					return "All-departments displays must use 'ALL' as the department ID"
				},
			},
		})
	}
}
