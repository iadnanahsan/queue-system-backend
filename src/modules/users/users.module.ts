import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {User} from "../../entities/user.entity"
import {Counter} from "../../entities/counter.entity"
import {QueueEntry} from "../queue/entities/queue-entry.entity"
import {UsersService} from "./users.service"
import {UsersController} from "./users.controller"
import {Department} from "../../entities/department.entity"
import {UserLoggingService} from "./services/logging.service"

@Module({
	imports: [TypeOrmModule.forFeature([User, Counter, QueueEntry, Department])],
	providers: [UsersService, UserLoggingService],
	controllers: [UsersController],
	exports: [UsersService], // Export for use in AuthModule
})
export class UsersModule {}
