import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {CountersController} from "./counters.controller"
import {CountersService} from "./counters.service"
import {Counter} from "../../entities/counter.entity"
import {DepartmentsModule} from "../departments/departments.module"

@Module({
	imports: [TypeOrmModule.forFeature([Counter]), DepartmentsModule],
	controllers: [CountersController],
	providers: [CountersService],
	exports: [CountersService],
})
export class CountersModule {}
