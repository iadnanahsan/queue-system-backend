import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {DisplayAccess} from "./entities/display-access.entity"
import {DisplayService} from "./display.service"
import {DisplayGateway} from "./display.gateway"
import {DisplayController} from "./display.controller"
import {RedisService} from "../../services/redis.service"
import {Department} from "../../entities/department.entity"

@Module({
	imports: [TypeOrmModule.forFeature([DisplayAccess, Department])],
	controllers: [DisplayController],
	providers: [DisplayService, DisplayGateway, RedisService],
	exports: [DisplayService, DisplayGateway], // Export for use in QueueModule
})
export class DisplayModule {}
