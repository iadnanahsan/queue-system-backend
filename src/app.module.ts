import {Module} from "@nestjs/common"
import {TypeOrmModule} from "@nestjs/typeorm"
import {ConfigModule, ConfigService} from "@nestjs/config"
import {UsersModule} from "./modules/users/users.module"
import {AuthModule} from "./modules/auth/auth.module"
import {DepartmentsModule} from "./modules/departments/departments.module"
import {CountersModule} from "./modules/counters/counters.module"
import {QueueModule} from "./modules/queue/queue.module"
import {SeedModule} from "./modules/seed/seed.module"
import {BullModule} from "@nestjs/bull"
import {AdminModule} from "./modules/admin/admin.module"
// Import entities from the entities folder
import {User} from "./entities/user.entity"
import {Department} from "./entities/department.entity"
import {Counter} from "./entities/counter.entity"
import {QueueEntry} from "./entities/queue-entry.entity"

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true, // Make config globally available
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				type: "postgres",
				host: configService.get("POSTGRES_HOST"),
				port: +configService.get("POSTGRES_PORT"),
				username: configService.get("POSTGRES_USER"),
				password: configService.get("POSTGRES_PASSWORD"),
				database: configService.get("POSTGRES_DB"),
				entities: [User, Department, Counter, QueueEntry], // Remove Staff
				synchronize: false,
				logging: true, // Add this to see SQL queries
				autoLoadEntities: true,
			}),
			inject: [ConfigService],
		}),
		UsersModule,
		AuthModule,
		DepartmentsModule,
		CountersModule,
		QueueModule,
		SeedModule,
		BullModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: (configService: ConfigService) => ({
				redis: {
					host: configService.get("REDIS_HOST"),
					port: configService.get("REDIS_PORT"),
					password: configService.get("REDIS_PASSWORD"),
				},
			}),
			inject: [ConfigService],
		}),
		AdminModule,
	],
})
export class AppModule {}
