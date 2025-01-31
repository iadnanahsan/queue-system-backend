import {Module} from "@nestjs/common"
import {ConfigModule, ConfigService} from "@nestjs/config"
import {TypeOrmModule} from "@nestjs/typeorm"
import {getDatabaseConfig} from "./config/database.config"
import {AuthModule} from "./modules/auth/auth.module"
import {SeedModule} from "./modules/seed/seed.module"

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: getDatabaseConfig,
		}),
		AuthModule,
		SeedModule,
		// Other modules will be added here
	],
})
export class AppModule {}
