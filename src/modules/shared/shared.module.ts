import {Module} from "@nestjs/common"
import {ConfigModule} from "@nestjs/config"
import {PollyService} from "../../services/polly.service"

@Module({
	imports: [ConfigModule],
	providers: [PollyService],
	exports: [PollyService], // Export so other modules can use it
})
export class SharedModule {}
