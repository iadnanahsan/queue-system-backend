import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {SeedService} from "./seed.service"
import {SeedController} from "./seed.controller"
import {User} from "../../entities/user.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {UsersModule} from "../users/users.module"
import {DepartmentsModule} from "../departments/departments.module"
import {CountersModule} from "../counters/counters.module"
import {UsersSeedService} from "./services/users-seed.service"

@Module({
	imports: [TypeOrmModule.forFeature([User, Department, Counter]), UsersModule, DepartmentsModule, CountersModule],
	providers: [SeedService, UsersSeedService],
	controllers: [SeedController],
	exports: [SeedService],
})
export class SeedModule {}
