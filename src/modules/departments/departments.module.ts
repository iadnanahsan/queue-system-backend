import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {DepartmentsController} from "./departments.controller"
import {DepartmentService} from "./departments.service"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {User} from "../../entities/user.entity"

@Module({
	imports: [TypeOrmModule.forFeature([Department, Counter, User])],
	controllers: [DepartmentsController],
	providers: [DepartmentService],
	exports: [DepartmentService],
})
export class DepartmentsModule {}
