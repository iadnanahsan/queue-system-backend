import {ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments} from "class-validator"
import {DisplayType} from "../enums/display-type.enum"

@ValidatorConstraint({name: "displayTypeDepartments", async: false})
export class DisplayTypeDepartmentsValidator implements ValidatorConstraintInterface {
	validate(departmentIds: string[], args: ValidationArguments) {
		const {display_type} = args.object as {display_type: DisplayType}

		switch (display_type) {
			case DisplayType.DEPARTMENT_SPECIFIC:
				return departmentIds?.length === 1
			case DisplayType.MULTIPLE_DEPARTMENTS:
				return departmentIds?.length > 1
			case DisplayType.ALL_DEPARTMENTS:
				// Reject if departmentIds exists and is not empty
				if (departmentIds && departmentIds.length > 0) {
					return false
				}
				return true
			default:
				return false
		}
	}

	defaultMessage(args: ValidationArguments) {
		const {display_type} = args.object as {display_type: DisplayType}

		switch (display_type) {
			case DisplayType.DEPARTMENT_SPECIFIC:
				return "Department specific display must have exactly one department"
			case DisplayType.MULTIPLE_DEPARTMENTS:
				return "Multiple departments display must have at least two departments"
			case DisplayType.ALL_DEPARTMENTS:
				return "All departments display must not include any department IDs"
			default:
				return "Invalid display type and departments combination"
		}
	}
}
