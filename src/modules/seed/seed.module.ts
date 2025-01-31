import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {User} from "../../entities/user.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {SeedService} from "./seed.service"

@Module({
	imports: [TypeOrmModule.forFeature([User, Department, Counter])],
	providers: [SeedService],
	exports: [SeedService],
})
export class SeedModule {}
