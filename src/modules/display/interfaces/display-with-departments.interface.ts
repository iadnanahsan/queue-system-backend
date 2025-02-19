import {DisplayAccess} from "../entities/display-access.entity"

export interface DisplayWithDepartments extends DisplayAccess {
	departmentIds: string[]
}
