import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {DisplayGateway} from "./display.gateway"
import {DisplayService} from "./display.service"
import {DisplayAccess} from "./entities/display-access.entity"
import {Department} from "../../entities/department.entity"
import {QueueEntry} from "../queue/entities/queue-entry.entity"
import {RedisService} from "../../services/redis.service"
import {DisplayController} from "./display.controller"
import {SharedModule} from "../shared/shared.module"

@Module({
	imports: [TypeOrmModule.forFeature([DisplayAccess, Department, QueueEntry]), SharedModule],
	controllers: [DisplayController],
	providers: [DisplayGateway, DisplayService, RedisService],
	exports: [DisplayGateway, DisplayService],
})
export class DisplayModule {}
