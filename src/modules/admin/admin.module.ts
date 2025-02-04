import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {Department, Counter, QueueEntry, User} from "../../entities"
import {AdminStatsController} from "./controllers/stats.controller"
import {AdminStatsService} from "./services/stats.service"
import {AdminGateway} from "./gateways/admin.gateway"
import {RedisService} from "../../services/redis.service"

@Module({
	imports: [TypeOrmModule.forFeature([Department, Counter, QueueEntry, User])],
	controllers: [AdminStatsController],
	providers: [AdminStatsService, AdminGateway, RedisService],
	exports: [AdminStatsService],
})
export class AdminModule {}
