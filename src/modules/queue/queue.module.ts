import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {QueueService} from "./queue.service"
import {QueueController} from "./queue.controller"
import {QueueEntry} from "./entities/queue-entry.entity"
import {Department} from "../../entities/department.entity"
import {Counter} from "../../entities/counter.entity"
import {User} from "../../entities/user.entity"
import {QueueGateway} from "./queue.gateway"
import {RedisService} from "../../services/redis.service"
import {BullModule} from "@nestjs/bull"
import {QueueNumberService} from "./services/queue-number.service"
import {QueueStateService} from "./services/queue-state.service"
import {AuthModule} from "../auth/auth.module"
import {ScheduleModule} from "@nestjs/schedule"
import {DisplayModule} from "../display/display.module"

@Module({
	imports: [
		TypeOrmModule.forFeature([QueueEntry, Department, Counter, User]),
		BullModule.registerQueue({
			name: "queue",
		}),
		AuthModule,
		ScheduleModule.forRoot(),
		DisplayModule,
	],
	controllers: [QueueController],
	providers: [QueueService, QueueGateway, RedisService, QueueNumberService, QueueStateService],
	exports: [QueueService, QueueGateway],
})
export class QueueModule {}
