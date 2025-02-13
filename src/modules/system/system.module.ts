import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {SystemService} from "./system.service"
import {SystemController} from "./system.controller"
import {User} from "../../entities/user.entity"
import {ConfigModule} from "@nestjs/config"
import {QueueEntry} from "../../entities/queue-entry.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {DisplayAccess} from "../display/entities/display-access.entity"

@Module({
	imports: [TypeOrmModule.forFeature([User, QueueEntry, Department, Counter, DisplayAccess]), ConfigModule],
	providers: [SystemService],
	controllers: [SystemController],
})
export class SystemModule {}
