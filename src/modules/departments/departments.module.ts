import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {DepartmentsController} from "./departments.controller"
import {DepartmentService} from "./departments.service"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"

@Module({
	imports: [TypeOrmModule.forFeature([Department, Counter])],
	controllers: [DepartmentsController],
	providers: [DepartmentService],
	exports: [DepartmentService],
})
export class DepartmentsModule {}
