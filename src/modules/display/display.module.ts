import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {DisplayGateway} from "./display.gateway"
import {DisplayService} from "./display.service"
import {DisplayAccess} from "./entities/display-access.entity"
import {Department} from "../../entities/department.entity"
import {QueueEntry} from "../../entities/queue-entry.entity"
import {Counter} from "../../entities/counter.entity"
import {RedisService} from "../../services/redis.service"
import {DisplayController} from "./display.controller"
import {PollyService} from "./polly.service"
import {ConfigModule} from "@nestjs/config"
import {DisplayAccessValidator} from "./validators/display-access.validator"

@Module({
	imports: [TypeOrmModule.forFeature([DisplayAccess, Department, QueueEntry, Counter]), ConfigModule],
	controllers: [DisplayController],
	providers: [DisplayGateway, DisplayService, RedisService, PollyService, DisplayAccessValidator],
	exports: [DisplayService, DisplayGateway],
})
export class DisplayModule {}
